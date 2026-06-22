import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { AudienceType } from '@prisma/client';

export class CreateEventDto {
  // Público-alvo. Para professor é ignorado e forçado para "student" no service.
  @IsEnum(AudienceType)
  @IsOptional()
  audience_type?: AudienceType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  // Não coletado na UI do MVP; default aplicado no banco/service ("general")
  @IsString()
  @IsOptional()
  event_type?: string;

  @IsString()
  @IsOptional()
  subject_id?: string;

  @IsString()
  @IsOptional()
  topic_id?: string;

  // Obrigatório quando audience_type = student (validado no service)
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  class_ids?: string[];
}
