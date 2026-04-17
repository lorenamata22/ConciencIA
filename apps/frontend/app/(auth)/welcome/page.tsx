import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession, getUserName } from '@/lib/session';
import { WelcomeScreen } from './welcome-screen';

export const metadata: Metadata = {
  title: 'Bienvenido — ConciencIA',
};

export default async function WelcomePage() {
  // Protege a rota: só usuários autenticados chegam aqui
  const session = await getSession();
  if (!session) redirect('/login');

  const name = await getUserName();

  return <WelcomeScreen name={name ?? ''} userType={session.userType} />;
}
