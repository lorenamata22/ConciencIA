import { IsOptional, IsString, IsArray } from 'class-validator';

export class UpdateTeacherDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subjectIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  classIds?: string[];
}
