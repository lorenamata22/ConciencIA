import { IsOptional, IsBooleanString } from 'class-validator';

// Filtro do GET /students/:id/alerts?resolved=false
export class ListAlertsQueryDto {
  @IsOptional()
  @IsBooleanString()
  resolved?: string;
}
