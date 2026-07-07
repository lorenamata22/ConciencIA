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
} from './rag.types';

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

    const topicFilter = topicId
      ? Prisma.sql`AND f.topic_id = ${topicId}`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<RagChunk[]>(Prisma.sql`
      SELECT
        e.id,
        e.chunk_text,
        e.metadata,
        e.embedding_vector <=> ${queryVector}::vector AS distance
      FROM embedding e
      JOIN file f ON f.id = e.file_id
      WHERE f.institution_id = ${institutionId}
        AND f.subject_id = ${subjectId}
        ${topicFilter}
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
    const rows = chunks.map(
      (chunkText, index) =>
        Prisma.sql`(${randomUUID()}, ${metadata.file_id}, ${chunkText}, ${JSON.stringify(vectors[index])}::vector, ${JSON.stringify(metadata)}::jsonb, now())`,
    );

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO embedding (id, file_id, chunk_text, embedding_vector, metadata, created_at)
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
