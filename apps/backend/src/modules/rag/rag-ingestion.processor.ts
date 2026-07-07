import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { RagService } from './rag.service';
import { QUEUE_RAG_INGESTION } from './rag.constants';
import { RagIngestionJob } from './rag.types';

// Worker da fila 'rag-ingestion', registrado no MESMO processo do Nest —
// suficiente para a escala do MVP; separar em deploy próprio é fácil depois.
// Erros relançados pelo RagService fazem o BullMQ aplicar o retry configurado
// no enqueue (attempts: 3, backoff exponencial de 5000ms).
@Processor(QUEUE_RAG_INGESTION)
export class RagIngestionProcessor extends WorkerHost {
  constructor(private readonly ragService: RagService) {
    super();
  }

  async process(job: Job<RagIngestionJob>): Promise<void> {
    await this.ragService.ingestFile(job.data);
  }
}
