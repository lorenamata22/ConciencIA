import { IsIn, IsUUID, ValidateIf } from 'class-validator';

export class CreateExamDto {
  @IsUUID()
  topic_id: string;

  @IsIn(['main', 'retry'])
  type: 'main' | 'retry';

  // Obrigatório quando type = 'retry' — parâmetro de request, não coluna
  @ValidateIf((dto: CreateExamDto) => dto.type === 'retry')
  @IsUUID()
  source_exam_id?: string;
}
