import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsUUID } from 'class-validator';

// Campos de formulário do upload multipart — valores chegam como string,
// por isso o Transform no is_ai_context
export class UploadFileDto {
  @IsIn(['main', 'supplementary'])
  document_type: 'main' | 'supplementary';

  @IsOptional()
  @IsUUID()
  subject_id?: string;

  @IsOptional()
  @IsUUID()
  topic_id?: string;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  is_ai_context: boolean;
}
