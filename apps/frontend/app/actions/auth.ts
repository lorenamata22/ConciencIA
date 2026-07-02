'use server';

import { redirect } from 'next/navigation';
import {
  apiLogin,
  apiForgotPassword,
  apiResetPassword,
  apiValidateCode,
  apiRegister,
  apiActivate,
  type ValidateCodeData,
} from '@/lib/api/auth';
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

export interface ValidateCodeState {
  error: string | null;
  data: ValidateCodeData | null;
}

// Valida license_code (turma) ou access_code (pré-cadastro) para o fluxo de sign-up
export async function validateCodeAction(code: string): Promise<ValidateCodeState> {
  if (!code.trim()) {
    return { error: 'Introduce el código.', data: null };
  }

  const result = await apiValidateCode(code.trim());

  if (result.statusCode !== 200 || !result.data) {
    return { error: result.message ?? 'Código inválido o expirado.', data: null };
  }

  return { error: null, data: result.data };
}

export interface CompleteRegistrationState {
  error: string | null;
}

// Finaliza o cadastro: register (license_code) ou activate (access_code)
export async function completeRegistrationAction(
  _prevState: CompleteRegistrationState,
  formData: FormData,
): Promise<CompleteRegistrationState> {
  const code = formData.get('code') as string;
  const codeType = formData.get('codeType') as string;
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const birthDate = formData.get('birthDate') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!code || !name || !birthDate) {
    return { error: 'Completa todos los campos obligatorios.' };
  }

  if (!password || password.length < 8) {
    return { error: 'La contraseña debe tener al menos 8 caracteres.' };
  }

  if (password !== confirmPassword) {
    return { error: 'Las contraseñas no coinciden.' };
  }

  const result =
    codeType === 'access'
      ? await apiActivate({ accessCode: code, name, birthDate, password })
      : await apiRegister({ licenseCode: code, name, email, birthDate, password });

  if (!result.data) {
    return { error: result.message ?? 'No se pudo completar el registro. Inténtalo de nuevo.' };
  }

  const { accessToken, refreshToken } = result.data;
  await createSession(accessToken, refreshToken);
  await saveUserName(name);

  redirect('/welcome');
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
