'use server';

import { createInstitution } from '@/lib/api/institution';

export interface CreateInstitutionState {
  error: string | null;
  success?: boolean;
  institutionName?: string;
  institutionId?: string;
}

export async function createInstitutionAction(
  _prev: CreateInstitutionState,
  formData: FormData,
): Promise<CreateInstitutionState> {
  const name = (formData.get('name') as string)?.trim();
  const email = (formData.get('email') as string)?.trim();
  const password = formData.get('password') as string;
  const representativeName = (formData.get('representativeName') as string)?.trim();
  const phone = (formData.get('phone') as string)?.trim() || undefined;
  const address = (formData.get('address') as string)?.trim() || undefined;
  const postalCode = (formData.get('postalCode') as string)?.trim() || undefined;
  const country = (formData.get('country') as string)?.trim() || undefined;
  const city = (formData.get('city') as string)?.trim() || undefined;

  if (!name || !email || !password || !representativeName) {
    return { error: 'Completa los campos obligatorios.' };
  }

  if (password.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres.' };
  }

  const result = await createInstitution({
    name,
    email,
    password,
    representativeName,
    phone,
    address,
    postalCode,
    country,
    city,
  });

  if (result.statusCode !== 201 || !result.data) {
    return { error: result.message ?? 'No se pudo crear la institución. Inténtalo de nuevo.' };
  }

  return {
    error: null,
    success: true,
    institutionName: result.data.name,
    institutionId: result.data.id,
  };
}
