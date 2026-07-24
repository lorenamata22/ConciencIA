import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AlertService } from './alert.service';
import { AlertRulesService } from './alert-rules.service';
import { AlertProcessor } from './alert.processor';
import { AlertController } from './alert.controller';
import { ALERT_SCAN_CRON, QUEUE_ALERT_SCAN } from './alert.constants';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_ALERT_SCAN })],
  controllers: [AlertController],
  providers: [AlertService, AlertRulesService, AlertProcessor, PrismaService],
  // Exportados para ExamModule (evento DIFFICULTY) e Class/Student (risco)
  exports: [AlertService, AlertRulesService],
})
export class AlertModule implements OnModuleInit {
  constructor(
    @InjectQueue(QUEUE_ALERT_SCAN) private readonly queue: Queue,
  ) {}

  // Registra o job repeatable diário (03:00). BullMQ deduplica por chave de
  // repeat, então reiniciar o processo não cria duplicatas.
  async onModuleInit(): Promise<void> {
    await this.queue.add(
      'daily-scan',
      {},
      {
        repeat: { pattern: ALERT_SCAN_CRON },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  }
}
