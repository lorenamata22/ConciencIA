import { IsOptional, IsString } from 'class-validator';

// Edição inline na 3ª coluna — título e/ou conteúdo, ambos opcionais
export class UpdateNoteDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;
}
