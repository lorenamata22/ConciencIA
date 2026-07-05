import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// Compartilhado por pasta e arquivo — rename só altera o nome
export class RenameItemDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;
}
