import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { AudienceType } from '@prisma/client';

export class UpdateEventDto {
  @IsEnum(AudienceType)
  @IsOptional()
  audience_type?: AudienceType;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  start_date?: string;

  @IsDateString()
  @IsOptional()
  end_date?: string;

  @IsString()
  @IsOptional()
  event_type?: string;

  @IsString()
  @IsOptional()
  subject_id?: string;

  @IsString()
  @IsOptional()
  topic_id?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  class_ids?: string[];
}
