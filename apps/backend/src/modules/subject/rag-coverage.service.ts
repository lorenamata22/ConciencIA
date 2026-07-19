import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AIProviderService } from '../ai-provider/ai-provider.service';
import { AIUsageService } from '../ai-usage/ai-usage.service';
import { RagService } from '../rag/rag.service';
import { TopicCoverageQuery } from '../rag/rag.types';

export interface TopicCoverageDto {
  id: string;
  title: string;
  covered: boolean;
  document_name: string | null;
}

export interface ModuleCoverageDto {
  id: string;
  name: string;
  topics: TopicCoverageDto[];
}

export interface SubjectCoverageDto {
  subject_id: string;
  subject_name: string;
  modules: ModuleCoverageDto[];
  covered_count: number;
  total_count: number;
}

// Cobertura do programa pelo material do RAG: para cada tópico da matéria,
// existe material indexado que o retrieval encontraria? Alimenta a tela de
// Documentación, onde o professor confere se o RAG cobre o programa antes de
// liberar a matéria para os alunos.
//
// Serviço à parte do SubjectService pelo mesmo motivo do ProgramParseService:
// é operação com chamada de IA (gate de token + AI_Usage), não CRUD.
@Injectable()
export class RagCoverageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProviderService: AIProviderService,
    private readonly aiUsageService: AIUsageService,
    private readonly ragService: RagService,
  ) {}

  async getCoverage(
    institutionId: string,
    subjectId: string,
    userId: string,
  ): Promise<SubjectCoverageDto> {
    // Isolamento por JOIN — Subject não tem institution_id direto (§5)
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, course: { institution_id: institutionId } },
      select: {
        id: true,
        name: true,
        modules: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            name: true,
            topics: {
              orderBy: { order: 'asc' },
              select: { id: true, title: true, description: true },
            },
          },
        },
      },
    });

    if (!subject) {
      throw new NotFoundException('Asignatura no encontrada');
    }

    const probes: TopicCoverageQuery[] = subject.modules.flatMap((module) =>
      module.topics.map((topic) => ({
        topicId: topic.id,
        // Mesma âncora usada no chat e na geração de exame: título + ementa
        text: [topic.title, topic.description]
          .filter((part): part is string => Boolean(part?.trim()))
          .join('\n'),
      })),
    );

    // Matéria sem tópicos: nada a sondar, nenhuma chamada à IA
    if (probes.length === 0) {
      return {
        subject_id: subject.id,
        subject_name: subject.name,
        modules: subject.modules.map((module) => ({
          id: module.id,
          name: module.name,
          topics: [],
        })),
        covered_count: 0,
        total_count: 0,
      };
    }

    await this.assertTokenBudget(userId, institutionId);

    const { results, estimatedTokens, model } =
      await this.ragService.probeTopicCoverage({
        institutionId,
        subjectId,
        topics: probes,
      });

    await this.registerUsage(userId, institutionId, estimatedTokens, model);

    const byTopicId = new Map(results.map((item) => [item.topic_id, item]));

    const modules: ModuleCoverageDto[] = subject.modules.map((module) => ({
      id: module.id,
      name: module.name,
      topics: module.topics.map((topic) => {
        const coverage = byTopicId.get(topic.id);
        return {
          id: topic.id,
          title: topic.title,
          covered: coverage?.covered ?? false,
          document_name: coverage?.document_name ?? null,
        };
      }),
    }));

    const allTopics = modules.flatMap((module) => module.topics);

    return {
      subject_id: subject.id,
      subject_name: subject.name,
      modules,
      covered_count: allTopics.filter((topic) => topic.covered).length,
      total_count: allTopics.length,
    };
  }

  private async assertTokenBudget(userId: string, institutionId: string) {
    const canProceed = await this.aiUsageService.hasAvailableTokens(
      userId,
      institutionId,
    );
    if (!canProceed) {
      throw new ForbiddenException('Límite de tokens de IA alcanzado');
    }
  }

  private async registerUsage(
    userId: string,
    institutionId: string,
    promptTokens: number,
    // Modelo de embedding reportado pela sonda — NÃO usar getModelName(),
    // que devolve o modelo de texto e falsearia o relatório de custo
    embeddingModel: string,
  ) {
    const provider = this.aiProviderService.getProvider();
    await this.aiUsageService.register({
      institution_id: institutionId,
      user_id: userId,
      provider: provider.getProviderName(),
      model: embeddingModel || provider.getProviderName(),
      prompt_tokens: promptTokens,
      // Embedding não gera tokens de resposta
      response_tokens: 0,
      cost: 0,
    });
  }
}
