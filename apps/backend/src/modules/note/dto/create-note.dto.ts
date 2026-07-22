import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateNoteDto {
  // Conversa que originou a nota — matéria, tópico e título derivam dela
  @IsNotEmpty()
  @IsString()
  conversation_id: string;

  @IsNotEmpty()
  @IsString()
  content: string;

  // Rastreabilidade opcional para a mensagem da IA que originou a nota
  @IsOptional()
  @IsString()
  source_message_id?: string;
}
