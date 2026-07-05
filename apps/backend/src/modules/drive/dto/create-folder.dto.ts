import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateFolderDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  // Ausente = pasta criada na raiz da instituição
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
