import type { Metadata } from 'next';
import Image from 'next/image';
import Logo from '@/assets/img/Logo.svg';
import { ResetPasswordForm } from './reset-password-form';

export const metadata: Metadata = {
  title: 'Nueva contraseña — ConciencIA',
};

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ResetPasswordPage({ params }: Props) {
  const { token } = await params;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-brand-bg px-4">
      <div className="mb-10 text-center">
        <Image src={Logo} alt="ConciencIA" width={457} height={67} />
      </div>

      <div className="w-full max-w-sm">
        <h2 className="text-xl font-bold text-brand-brown mb-2">Nueva contraseña</h2>
        <p className="text-sm text-brand-placeholder mb-6">
          Elige una contraseña segura para tu cuenta.
        </p>
        <ResetPasswordForm token={token} />
      </div>
    </main>
  );
}
