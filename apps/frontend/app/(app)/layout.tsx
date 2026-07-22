import { redirect } from 'next/navigation';
import { getSession, getUserName } from '@/lib/session';
import { Sidebar } from '@/components/ui/sidebar';
import { PomodoroProvider } from '@/components/providers/pomodoro-provider';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  const userName = await getUserName();

  return (
    // PomodoroProvider aqui (acima de /student/* e /calendar) mantém a contagem
    // viva ao circular por toda a área autenticada; a UI do timer vive só no
    // header do aluno e consome esse contexto.
    <PomodoroProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar userName={userName ?? ''} userType={session.userType} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </PomodoroProvider>
  );
}
