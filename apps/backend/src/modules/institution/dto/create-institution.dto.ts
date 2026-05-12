import { IsNotEmpty, IsOptional, IsInt, IsPositive, IsString } from 'class-validator';

export class CreateInstitutionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  ai_token_limit?: number;
}
