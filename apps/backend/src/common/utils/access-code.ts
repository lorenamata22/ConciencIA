import { randomInt } from 'crypto';

// Alfabeto sem caracteres ambíguos (I, O, 0, 1)
const ACCESS_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ACCESS_CODE_LENGTH = 8;

// Gera token de ativação de conta — randomInt é criptograficamente seguro
export function generateAccessCode(): string {
  let code = '';
  for (let i = 0; i < ACCESS_CODE_LENGTH; i++) {
    code += ACCESS_CODE_CHARS[randomInt(ACCESS_CODE_CHARS.length)];
  }
  return code;
}
