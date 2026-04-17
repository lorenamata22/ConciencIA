'use server';

import { redirect } from 'next/navigation';
import { apiLogin } from '@/lib/api/auth';
import { createSession, deleteSession, parseJwtPayload, saveUserName } from '@/lib/session';

export interface LoginState {
  error: string | null;
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Preencha e-mail e senha.' };
  }

  const result = await apiLogin(email, password);

  if (result.statusCode !== 200 || !result.data) {
    return { error: result.message ?? 'Credenciais inválidas.' };
  }

  const { accessToken, refreshToken, name } = result.data;
  await createSession(accessToken, refreshToken);

  // Salva o nome para exibição na tela de boas-vindas
  if (name) {
    await saveUserName(name);
  }

  redirect('/welcome');
}

export async function logoutAction() {
  await deleteSession();
  redirect('/login');
}
