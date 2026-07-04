import Link from 'next/link';
import { getMyTasks, getTaskFormOptions } from '@/lib/api/task';
import { TasksList } from './tasks-list';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function TeacherTasksPage() {
  const [tasks, options] = await Promise.all([getMyTasks(), getTaskFormOptions()]);
  const lastUpdate = formatDate(new Date().toISOString());

  return (
    <div className="pt-10 px-10 md:px-30 pb-16">
      <div className="mt-15 mb-10">
        <Link
          href="/teacher"
          className="flex items-center gap-1.5 text-sm text-brand-label hover:text-brand-brown transition-colors w-fit"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Home
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl text-brand">Tareas</h1>
          <p className="text-sm text-brand-label mt-1">Última actualización: {lastUpdate}</p>
        </div>
        <Link
          href="/teacher/tasks/new"
          className="shrink-0 px-6 py-3 rounded-xl text-sm font-medium bg-primary hover:bg-primary-hover text-primary-text transition-colors"
        >
          Nueva tarea
        </Link>
      </div>

      <TasksList tasks={tasks} subjects={options.subjects} />
    </div>
  );
}
