import type { Metadata } from 'next';
import Image from 'next/image';
import Logo from '@/assets/img/Logo.svg';
import { ForgotPasswordForm } from './forgot-password-form';

export const metadata: Metadata = {
  title: 'Recuperar contraseña — ConciencIA',
};

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-brand-bg px-4">
      <div className="mb-10 text-center">
        <Image src={Logo} alt="ConciencIA" width={457} height={67} />
      </div>

      <div className="w-full max-w-sm">
        <h2 className="text-xl font-bold text-brand-brown mb-6">Recuperar contraseña</h2>
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
