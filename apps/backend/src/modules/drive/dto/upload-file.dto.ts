import { IsOptional, IsUUID } from 'class-validator';

// Campo de formulário do upload multipart
export class UploadFileDto {
  // Ausente = arquivo enviado para a raiz da instituição
  @IsOptional()
  @IsUUID()
  folderId?: string;
}
