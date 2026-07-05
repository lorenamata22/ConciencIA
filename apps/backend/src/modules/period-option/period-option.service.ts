import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const DEFAULT_PERIODS = [
  'Matutino (8:00-12:30)',
  'Vespertino (12:30-18:00)',
  'Noturno (18:00-22:30)',
  'Integral',
];

@Injectable()
export class PeriodOptionService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByInstitution(institutionId: string): Promise<string[]> {
    const options = await this.prisma.periodOption.findMany({
      where: { institution_id: institutionId },
      orderBy: { label: 'asc' },
      select: { label: true },
    });

    if (options.length === 0) {
      await this.prisma.periodOption.createMany({
        data: DEFAULT_PERIODS.map((label) => ({
          institution_id: institutionId,
          label,
        })),
      });
      return DEFAULT_PERIODS;
    }

    return options.map((o) => o.label);
  }

  async replaceAll(institutionId: string, labels: string[]): Promise<string[]> {
    const cleaned = labels.map((l) => l.trim()).filter(Boolean);
    await this.prisma.periodOption.deleteMany({
      where: { institution_id: institutionId },
    });
    if (cleaned.length > 0) {
      await this.prisma.periodOption.createMany({
        data: cleaned.map((label) => ({
          institution_id: institutionId,
          label,
        })),
      });
    }
    return cleaned;
  }
}
