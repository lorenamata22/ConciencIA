import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { parseOffice } from 'officeparser';
import { PrismaService } from '../../prisma/prisma.service';
import { AIProviderService } from '../ai-provider/ai-provider.service';
import { StorageService } from '../storage/storage.service';
import {
  CHUNK_OVERLAP_CHARS,
  CHUNK_SIZE_CHARS,
  DEFAULT_TOP_K,
  MAX_COSINE_DISTANCE,
  MIN_EXTRACTED_TEXT_LENGTH,
  SUPPORTED_RAG_EXTENSIONS,
} from './rag.constants';
import {
  RagChunk,
  RagChunkMetadata,
  RagIngestionJob,
  RagSearchParams,
  RagSearchResult,
  TopicCoverageItem,
  TopicCoverageQuery,
  TopicCoverageResult,
} from './rag.types';

// A API de embeddings do Gemini não reporta contagem de tokens, mas §11 exige
// registro em AI_Usage de toda chamada à IA — estimamos por ~4 chars/token,
// mesma convenção usada no ChatService quando o stream não reporta tokens.
const estimateEmbeddingTokens = (texts: string[]): number =>
  texts.reduce((total, text) => total + Math.ceil(text.length / 4), 0);

// Módulo mais crítico do sistema (CLAUDE.md §7): toda query de embedding
// DEVE ser filtrada por institution_id — sem exceção.
@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProvider: AIProviderService,
    private readonly storage: StorageService,
  ) {}

  // Pipeline de ingestão executado pelo worker da fila 'rag-ingestion':
  // download → extração de texto → chunking → embedding em lote → inserção.
  // Falhas permanentes (extensão não suportada, sem texto extraível) marcam
  // failed e retornam sem lançar — retry seria inútil. Falhas transitórias
  // (rede, API, banco) marcam failed e relançam para o BullMQ tentar de novo.
  async ingestFile(job: RagIngestionJob): Promise<void> {
    const { fileId, institutionId, fileUrl, fileName, replaceExisting } = job;

    await this.prisma.file.update({
      where: { id: fileId },
      data: { ingestion_status: 'processing', ingestion_error: null },
    });

    try {
      const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
      if (!SUPPORTED_RAG_EXTENSIONS.includes(extension)) {
        await this.markFailed(
          fileId,
          `unsupported file type ".${extension}" for AI context — supported types: ${SUPPORTED_RAG_EXTENSIONS.join(', ')}`,
        );
        return;
      }

      // Substituição de arquivo: deletar TODOS os embeddings antigos antes
      // de processar a nova versão (regra inegociável do CLAUDE.md §12)
      if (replaceExisting) {
        await this.prisma.embedding.deleteMany({
          where: { file_id: fileId },
        });
      }

      const file = await this.prisma.file.findUnique({
        where: { id: fileId },
        include: { topic: true },
      });
      if (!file) {
        this.logger.warn(
          `File ${fileId} no longer exists — skipping ingestion`,
        );
        return;
      }

      const buffer = await this.storage.downloadByUrl(fileUrl);
      // ocr: false explícito — OCR fica fora de escopo no MVP (guard abaixo
      // cobre PDFs escaneados marcando failed em vez de fingir sucesso)
      const ast = await parseOffice(buffer, { ocr: false });
      const text = (ast.toText() ?? '').trim();

      // Guard de texto insuficiente (ex: PDF escaneado sem camada de texto).
      // Não é OCR — só evita fingir sucesso indexando chunks vazios/inúteis.
      if (text.length < MIN_EXTRACTED_TEXT_LENGTH) {
        await this.markFailed(
          fileId,
          'no extractable text found — possibly a scanned/image-only document',
        );
        return;
      }

      const chunks = this.chunkText(text);

      // Uma única chamada com o array inteiro — a API da Voyage aceita lote
      const { vectors } = await this.aiProvider.embed(chunks);

      const metadata: RagChunkMetadata = {
        institution_id: institutionId,
        file_id: fileId,
        subject_id: file.subject_id,
        topic_id: file.topic_id,
        module_id: file.topic?.module_id ?? null,
        document_name: fileName,
      };

      await this.insertEmbeddings(chunks, vectors, metadata);

      await this.prisma.file.update({
        where: { id: fileId },
        data: { ingestion_status: 'completed' },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'unknown ingestion error';
      await this.markFailed(fileId, message);
      throw error;
    }
  }

  // Busca por similaridade para o Chat: embedding da pergunta → top K chunks
  // via operador <=> do pgvector. SEMPRE via Prisma.sql parametrizado —
  // nunca concatenação de string (institution_id concatenado = injeção de SQL).
  async search(params: RagSearchParams): Promise<RagSearchResult> {
    const {
      query,
      institutionId,
      subjectId,
      topicId,
      topK = DEFAULT_TOP_K,
    } = params;

    const { vectors } = await this.aiProvider.embed([query]);
    const queryVector = JSON.stringify(vectors[0]);

    // Escopo denormalizado, sem JOIN no caminho quente (§7.1):
    // - com topicId (chat): material do tópico OU material da matéria inteira
    //   (subject_id da matéria e topic_id NULL). Upload só de institution nunca entra.
    // - sem topicId (exame): matéria inteira. institution_id SEMPRE presente.
    const scopeFilter = topicId
      ? Prisma.sql`AND (e.topic_id = ${topicId} OR (e.subject_id = ${subjectId} AND e.topic_id IS NULL))`
      : Prisma.sql`AND e.subject_id = ${subjectId}`;

    const rows = await this.prisma.$queryRaw<RagChunk[]>(Prisma.sql`
      SELECT
        e.id,
        e.chunk_text,
        e.metadata,
        e.embedding_vector <=> ${queryVector}::vector AS distance
      FROM embedding e
      WHERE e.institution_id = ${institutionId}
        ${scopeFilter}
      ORDER BY e.embedding_vector <=> ${queryVector}::vector
      LIMIT ${topK}
    `);

    // Corte por relevância + defesa em profundidade no isolamento de tenant:
    // um chunk de outra institution nunca pode chegar ao prompt
    const chunks = rows.filter(
      (row) =>
        row.distance <= MAX_COSINE_DISTANCE &&
        row.metadata.institution_id === institutionId,
    );

    return { chunks, hasSufficientContext: chunks.length > 0 };
  }

  // Sonda de cobertura do programa: para cada tópico, existe algum chunk da
  // matéria dentro do limiar? Alimenta a tela de Documentación, onde o
  // professor vê quais tópicos o material já cobre.
  //
  // Deliberadamente NÃO conta embeddings rotulados por topic_id (hoje sempre
  // NULL): mede o que o retrieval de fato encontraria, então um tópico verde
  // significa "o Modo Exame consegue gerar prova deste tópico".
  async probeTopicCoverage(params: {
    institutionId: string;
    subjectId: string;
    topics: TopicCoverageQuery[];
  }): Promise<TopicCoverageResult> {
    const { institutionId, subjectId, topics } = params;

    if (topics.length === 0) {
      return { results: [], estimatedTokens: 0, model: '' };
    }

    // Um único lote para todos os tópicos — o adapter já fatia em sub-lotes
    // de 98 internamente. 50 tópicos = 1 requisição, não 50.
    const { vectors, model } = await this.aiProvider.embed(
      topics.map((topic) => topic.text),
    );

    const results: TopicCoverageItem[] = [];

    for (let index = 0; index < topics.length; index++) {
      const queryVector = JSON.stringify(vectors[index]);

      // Só o vizinho mais próximo: a pergunta é binária ("existe algo
      // relevante?"), não precisamos do top K.
      const rows = await this.prisma.$queryRaw<RagChunk[]>(Prisma.sql`
        SELECT
          e.chunk_text,
          e.metadata,
          e.embedding_vector <=> ${queryVector}::vector AS distance
        FROM embedding e
        WHERE e.institution_id = ${institutionId}
          AND e.subject_id = ${subjectId}
        ORDER BY e.embedding_vector <=> ${queryVector}::vector
        LIMIT 1
      `);

      // Mesma defesa em profundidade do search(): chunk de outro tenant é
      // descartado mesmo que a query o tenha retornado
      const nearest = rows.find(
        (row) => row.metadata?.institution_id === institutionId,
      );
      const covered =
        nearest != null && nearest.distance <= MAX_COSINE_DISTANCE;

      results.push({
        topic_id: topics[index].topicId,
        covered,
        best_distance: nearest?.distance ?? null,
        document_name: covered ? (nearest?.metadata?.document_name ?? null) : null,
      });
    }

    return {
      results,
      estimatedTokens: estimateEmbeddingTokens(topics.map((t) => t.text)),
      model,
    };
  }

  // Sliding window simples em caracteres, igual para PDF/DOCX/PPTX no MVP.
  // Atenção (Phase 2): texto de PPTX tende a vir fragmentado (títulos e
  // bullets curtos por slide), o que pode degradar a qualidade de retrieval —
  // se comprovado, avaliar chunking por slide/seção para esse formato.
  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    const step = CHUNK_SIZE_CHARS - CHUNK_OVERLAP_CHARS;

    for (let start = 0; start < text.length; start += step) {
      const chunk = text.slice(start, start + CHUNK_SIZE_CHARS).trim();
      if (chunk.length > 0) chunks.push(chunk);
      if (start + CHUNK_SIZE_CHARS >= text.length) break;
    }

    return chunks;
  }

  // Inserção via SQL raw: embedding_vector é Unsupported("vector") no Prisma,
  // então o client tipado não alcança a coluna. Um único INSERT multi-row.
  private async insertEmbeddings(
    chunks: string[],
    vectors: number[][],
    metadata: RagChunkMetadata,
  ): Promise<void> {
    // Escopo denormalizado (§7.1) vem do metadata — mesma fonte (File) já usada
    // no pipeline. Vale igual na re-indexação (os chunks novos são reinseridos).
    const rows = chunks.map(
      (chunkText, index) =>
        Prisma.sql`(${randomUUID()}, ${metadata.file_id}, ${metadata.institution_id}, ${metadata.subject_id}, ${metadata.topic_id}, ${metadata.module_id}, ${chunkText}, ${JSON.stringify(vectors[index])}::vector, ${JSON.stringify(metadata)}::jsonb, now())`,
    );

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO embedding (id, file_id, institution_id, subject_id, topic_id, module_id, chunk_text, embedding_vector, metadata, created_at)
      VALUES ${Prisma.join(rows)}
    `);
  }

  private async markFailed(fileId: string, reason: string): Promise<void> {
    this.logger.error(`RAG ingestion failed for file ${fileId}: ${reason}`);
    await this.prisma.file.update({
      where: { id: fileId },
      data: { ingestion_status: 'failed', ingestion_error: reason },
    });
  }
}
