import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertRulesService } from './alert-rules.service';
import { QUEUE_ALERT_SCAN } from './alert.constants';

// Worker da fila 'alert-scan' — job diário de varredura dos alertas de
// ausência (INACTIVITY, NEVER_STARTED, LOW_PARTICIPATION). Varre por
// instituição; runDailyScan nunca cruza tenants.
@Processor(QUEUE_ALERT_SCAN)
export class AlertProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alertRules: AlertRulesService,
  ) {
    super();
  }

  async process(_job: Job): Promise<void> {
    const institutions = await this.prisma.institution.findMany({
      select: { id: true },
    });
    for (const institution of institutions) {
      await this.alertRules.runDailyScan(institution.id);
    }
  }
}
