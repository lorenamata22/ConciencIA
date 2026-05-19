import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateCourseDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
