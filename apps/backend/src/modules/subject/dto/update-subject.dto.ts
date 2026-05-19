import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateSubjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  courseId?: string;
}
