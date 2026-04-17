import { getSession } from '@/lib/session';
import { logoutAction } from '@/app/actions/auth';

export default async function TeacherDashboard() {
  const session = await getSession();

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Dashboard do Professor</h1>
      <p className="text-gray-500 mt-1">Bem-vindo, {session?.userId}</p>
      <form action={logoutAction} className="mt-4">
        <button type="submit" className="text-sm text-red-600 hover:underline">
          Sair
        </button>
      </form>
    </main>
  );
}
