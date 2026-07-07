import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

// Dados do arquivo já enviado ao storage — o controller resolve url/size/type
// a partir do multipart antes de chamar o service
export class CreateFileDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsIn(['main', 'supplementary'])
  document_type: 'main' | 'supplementary';

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsInt()
  size: number;

  @IsOptional()
  @IsUUID()
  subject_id?: string;

  @IsOptional()
  @IsUUID()
  topic_id?: string;

  @IsBoolean()
  is_ai_context: boolean;
}
