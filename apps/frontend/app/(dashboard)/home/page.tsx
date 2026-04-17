import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

// Rota /home — redireciona para o dashboard correto conforme o role do usuário
export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const roleRedirects: Record<string, string> = {
    student: '/dashboard/student',
    teacher: '/dashboard/teacher',
    institution: '/dashboard/institution',
    super_admin: '/dashboard/admin',
  };

  const destination = roleRedirects[session.userType] ?? '/dashboard/student';
  redirect(destination);
}
