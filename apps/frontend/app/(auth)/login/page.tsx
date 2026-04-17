import type { Metadata } from 'next';
import { LoginForm } from './login-form';
import Image from 'next/image'
import Logo from '@/assets/img/Logo.svg'

export const metadata: Metadata = {
  title: 'Login — ConciencIA',
};

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-brand-bg px-4">
      {/* Logo */}
      <div className="mb-10 text-center">
        {/*
          Substitua o conteúdo abaixo pelo componente de logo SVG quando disponível.
          O elefante no final do "ConciencIA" faz parte do asset de marca.
        */}
        {/* <h1 className="text-6xl sm:text-7xl font-black text-brand-brown tracking-tight leading-none select-none">
          ConciencIA
        </h1> */}
        <Image src={Logo} alt="ConciencIA" width={457} height={67}/>
      </div>

      {/* Formulário */}
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </main>
  );
}
