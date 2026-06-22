import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getEvents, getSelectableClasses } from '@/lib/api/event';
import { CalendarClient } from '@/components/modules/calendar/calendar-client';

export default async function CalendarPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const canCreate = session.userType !== 'student';

  // Eventos sempre; turmas só para quem pode criar eventos de aluno
  const [events, classes] = await Promise.all([
    getEvents(),
    canCreate ? getSelectableClasses() : Promise.resolve([]),
  ]);

  return (
    <div className="pt-10 px-10 md:px-30 pb-16">
      <CalendarClient
        role={session.userType}
        userId={session.userId}
        initialEvents={events}
        classes={classes}
      />
    </div>
  );
}
