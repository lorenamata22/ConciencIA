import { IsOptional, IsInt, IsPositive, IsString, IsIn } from 'class-validator';

export class UpdateInstitutionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['active', 'pending', 'inactive'])
  status?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  ai_token_limit?: number;
}
