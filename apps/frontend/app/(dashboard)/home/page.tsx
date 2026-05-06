import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

// Rota /home — redireciona para o dashboard correto conforme o role do usuário
export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const roleRedirects: Record<string, string> = {
    student: '/student',
    teacher: '/teacher',
    institution: '/institution',
    super_admin: '/admin',
  };

  const destination = roleRedirects[session.userType] ?? '/student';
  redirect(destination);
}
