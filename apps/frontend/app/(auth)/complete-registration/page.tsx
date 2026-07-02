import type { Metadata } from 'next';
import Image from 'next/image';
import Logo from '@/assets/img/Logo.svg';
import { RegistrationFlow } from './registration-flow';

export const metadata: Metadata = {
  title: 'Registro — ConciencIA',
};

export default async function CompleteRegistrationPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-brand-bg px-4 py-10">
      {/* Logo */}
      <div className="mb-10 text-center">
        <Image src={Logo} alt="ConciencIA" width={457} height={67} />
      </div>

      <div className="w-full max-w-sm">
        <RegistrationFlow initialCode={code ?? ''} />
      </div>
    </main>
  );
}
