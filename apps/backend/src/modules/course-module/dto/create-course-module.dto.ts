import { IsInt, IsNotEmpty, IsString, IsUUID, Min } from 'class-validator';

export class CreateCourseModuleDto {
  @IsUUID()
  subject_id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(0)
  order: number;
}
