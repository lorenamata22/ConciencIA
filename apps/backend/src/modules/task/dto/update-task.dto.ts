import { IsArray, ArrayMinSize, IsNotEmpty, IsString } from 'class-validator';

export class UpdateTaskDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  subjectId: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  classIds: string[];
}
