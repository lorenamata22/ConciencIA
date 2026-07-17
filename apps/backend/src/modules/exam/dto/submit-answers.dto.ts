import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { EXAM_ESSAY_MAX_CHARS } from '../exam.constants';

export class AnswerItemDto {
  @IsString()
  question_id: string;

  @IsOptional()
  @IsIn(['a', 'b', 'c', 'd'])
  selected_option_id?: string | null;

  // Truncado no DTO antes de chegar ao prompt (CLAUDE.md §8)
  @IsOptional()
  @IsString()
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.slice(0, EXAM_ESSAY_MAX_CHARS) : value,
  )
  essay_text?: string | null;
}

export class SubmitAnswersDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => AnswerItemDto)
  answers: AnswerItemDto[];
}
