import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateStudentInstitutionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsBoolean()
  isMinor?: boolean;
}
