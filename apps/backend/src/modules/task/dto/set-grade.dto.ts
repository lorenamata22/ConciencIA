import { IsNotEmpty, IsString } from 'class-validator';

export class SetGradeDto {
  // Nota no formato "9.5" — validação de faixa (0–10, 1 decimal) feita no service
  @IsNotEmpty()
  @IsString()
  value: string;
}
