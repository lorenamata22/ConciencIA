import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsUUID()
  conversation_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content: string;
}
