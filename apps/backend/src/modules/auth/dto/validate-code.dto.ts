import { IsNotEmpty, IsString } from 'class-validator';

export class ValidateCodeDto {
  @IsNotEmpty()
  @IsString()
  code: string;
}

// Resultado da validação — diz ao frontend qual fluxo seguir (register vs activate)
export interface ValidateCodeResult {
  codeType: 'license' | 'access';
  institutionName: string;
  courseName: string | null;
  className: string | null;
  prefill?: { name: string; email: string };
}
