import { IsString, IsNotEmpty, IsInt, Min, Max, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateClassDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  courseId: string;

  @IsInt()
  @Min(2000)
  @Max(2100)
  @Type(() => Number)
  @IsOptional()
  year?: number;

  @IsString()
  @IsNotEmpty()
  period: string;
}
