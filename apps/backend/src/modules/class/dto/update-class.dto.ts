import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateClassDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  courseId?: string;

  @IsInt()
  @Min(2000)
  @Max(2100)
  @Type(() => Number)
  @IsOptional()
  year?: number;

  @IsString()
  @IsOptional()
  period?: string;
}
