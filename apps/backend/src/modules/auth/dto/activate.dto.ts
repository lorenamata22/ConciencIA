import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class ActivateDto {
  @IsNotEmpty()
  @IsString()
  accessCode: string;

  // Email não é editável na ativação — a identidade vem do pré-cadastro
  @IsOptional()
  @IsString()
  name?: string;

  @IsDateString()
  birthDate: string;

  @IsString()
  @MinLength(8)
  password: string;
}
