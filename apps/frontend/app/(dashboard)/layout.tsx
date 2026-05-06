import { redirect } from 'next/navigation';
import { getSession, getUserName } from '@/lib/session';
import { Sidebar } from '@/components/ui/sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  const userName = await getUserName();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userName={userName ?? ''} userType={session.userType} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
