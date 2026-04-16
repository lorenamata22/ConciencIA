import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Rotas decoradas com @Public() ignoram o guard global de autenticação
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
