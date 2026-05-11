'use server';

import { redirect } from 'next/navigation';
import { apiLogin, apiForgotPassword, apiResetPassword } from '@/lib/api/auth';
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
    return { error: result.message ?? 'Lo sentimos, ese email o contraseña no son correctos.' };
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

export interface ForgotPasswordState {
  error: string | null;
  success: boolean;
}

export async function forgotPasswordAction(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = formData.get('email') as string;

  if (!email) {
    return { error: 'Informe o e-mail.', success: false };
  }

  await apiForgotPassword(email);

  // Sempre retorna sucesso para não expor se o email existe
  return { error: null, success: true };
}

export interface ResetPasswordState {
  error: string | null;
  success: boolean;
}

export async function resetPasswordAction(
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const token = formData.get('token') as string;
  const newPassword = formData.get('newPassword') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!newPassword || newPassword.length < 8) {
    return { error: 'A senha deve ter pelo menos 8 caracteres.', success: false };
  }

  if (newPassword !== confirmPassword) {
    return { error: 'As senhas não coincidem.', success: false };
  }

  const result = await apiResetPassword(token, newPassword);

  if (result.statusCode !== 200) {
    return { error: result.message ?? 'Token inválido ou expirado.', success: false };
  }

  return { error: null, success: true };
}
