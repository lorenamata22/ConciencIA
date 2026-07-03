import Link from 'next/link';
import { getSession, getUserName } from '@/lib/session';
import { formatFirstName } from '@/lib/utils/user';
import { getTeacherDashboardStats } from '@/lib/api/teacher';
import { getEvents, getSelectableClasses } from '@/lib/api/event';
import { CalendarClient } from '@/components/modules/calendar/calendar-client';
import { TopbarIcons } from '@/components/ui/topbar-icons';

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function formatFullDate(date: Date): string {
  const label = date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default async function TeacherDashboardPage() {
  const [session, userName, stats, events, classes] = await Promise.all([
    getSession(),
    getUserName(),
    getTeacherDashboardStats(),
    getEvents(),
    getSelectableClasses(),
  ]);

  const now = new Date();
  const firstName = userName ? formatFirstName(userName) : '';

  return (
    <div className="pt-10 px-10 md:px-30 pb-16">

      <div className="flex items-start justify-end gap-4 mb-10">
        <TopbarIcons notificationCount={0} />
      </div>

      <div className="flex items-start justify-between gap-4 mb-15 mt-25">
        <div>
          <h1 className="text-3xl text-brand-brown">
            {greetingForHour(now.getHours())}
            {firstName ? `, ${firstName}!` : '!'}
          </h1>
          <p className="text-sm text-brand-label mt-1">{formatFullDate(now)}</p>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/teacher/lessons"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-text hover:bg-primary-hover transition-colors px-10"
          >
            <svg width="20" height="16" viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4.48608 0.100403C5.27162 0.100409 5.98243 0.423677 6.49585 0.946106C7.01004 1.46871 7.32886 2.19099 7.32886 2.9881L7.31323 3.28302C7.24475 3.96172 6.94479 4.57186 6.49487 5.02911C6.24476 5.28322 5.9471 5.48795 5.61792 5.63361C5.63452 5.63473 5.65082 5.63534 5.66675 5.63654C5.8293 5.64871 5.96537 5.66462 6.04272 5.68732L7.36206 6.07892L7.48706 6.10626H7.48608C7.52212 6.11169 7.56277 6.11407 7.61206 6.11407H12.4373C12.7712 6.11407 13.0749 6.25304 13.2937 6.4754C13.5123 6.69769 13.6482 7.0049 13.6482 7.34259C13.6482 7.67901 13.5138 7.98021 13.2976 8.20001C13.0805 8.4206 12.7799 8.55888 12.45 8.57111L8.67554 8.71271C8.78439 10.1851 8.76912 11.8154 8.75366 13.3582C8.74891 13.8436 8.74292 14.3195 8.74292 14.9256C8.74292 15.1306 8.57936 15.2996 8.37378 15.2996H0.469482C0.263937 15.2996 0.100411 15.1315 0.100342 14.9266C0.100342 14.7652 0.110028 12.5252 0.130615 10.8358C0.135762 10.3976 0.142032 10.0042 0.14917 9.70782C0.152736 9.55985 0.156793 9.43553 0.160889 9.34161C0.164839 9.25103 0.169532 9.18071 0.175537 9.14728C0.318001 8.36173 0.659796 7.64582 1.14624 7.05841C1.63838 6.46361 2.27866 5.99911 3.00854 5.72247C3.08682 5.69283 3.21814 5.67213 3.37183 5.65607C3.38039 5.65517 3.38943 5.65401 3.39819 5.65314C3.05071 5.50669 2.73697 5.29494 2.47534 5.02911C1.96118 4.50653 1.64332 3.7844 1.64331 2.9881C1.64331 2.19099 1.96115 1.46871 2.47534 0.946106C2.98953 0.423661 3.70047 0.100403 4.48608 0.100403ZM4.46362 6.35138C4.17967 6.35419 3.90293 6.36237 3.68335 6.37482C3.57362 6.38104 3.47881 6.38786 3.40503 6.3963C3.32755 6.40518 3.28306 6.41442 3.26636 6.42072C2.65701 6.65091 2.12284 7.03973 1.71167 7.53595C1.30597 8.02667 1.01995 8.62421 0.901123 9.28107C0.90113 9.28107 0.899838 9.28433 0.89917 9.29181C0.898508 9.29928 0.897958 9.30955 0.897217 9.32208C0.895729 9.34732 0.894823 9.38155 0.893311 9.42365C0.890283 9.508 0.88646 9.62352 0.883545 9.76349C0.877718 10.0434 0.873064 10.4208 0.86792 10.8445V10.8455C0.852055 12.0851 0.84248 13.7968 0.8396 14.5526H2.05249V10.407C2.05249 10.2021 2.21605 10.033 2.42163 10.033C2.62706 10.0332 2.79077 10.2022 2.79077 10.407V14.5526H8.00562C8.00755 14.199 8.01105 13.779 8.01538 13.3533C8.03281 11.6833 8.05104 9.92245 7.90991 8.38947V8.38849C7.89202 8.18653 8.03859 8.0048 8.23999 7.98419C8.24994 7.98282 8.25936 7.98324 8.2644 7.98322L12.4226 7.82794H12.4236C12.56 7.82311 12.6838 7.76479 12.7742 7.67365C12.8586 7.58764 12.9099 7.47275 12.9099 7.34357C12.9099 7.21192 12.8563 7.09132 12.7703 7.00372C12.6841 6.9161 12.5654 6.86212 12.4373 6.86212L7.61206 6.86115C7.53399 6.86113 7.45857 6.85572 7.38159 6.84454V6.84357C7.30782 6.83306 7.23417 6.81726 7.15698 6.79474L7.15601 6.79376L5.83765 6.40314C5.81325 6.39584 5.75605 6.38742 5.66577 6.3797C5.57864 6.37225 5.46807 6.36574 5.34155 6.36115C5.08862 6.35196 4.77482 6.34857 4.46362 6.35138ZM18.9304 0.194153C19.136 0.194153 19.2996 0.36322 19.2996 0.568176V11.9285C19.2994 12.1334 19.1359 12.3016 18.9304 12.3016H9.68042C9.47493 12.3016 9.31143 12.1334 9.31128 11.9285C9.31128 11.7236 9.47484 11.5545 9.68042 11.5545H18.5623L18.5613 0.941223H7.74487C7.53964 0.940987 7.37597 0.772786 7.37573 0.568176C7.37573 0.363363 7.53949 0.194389 7.74487 0.194153H18.9304ZM4.48511 0.847473C3.90441 0.847493 3.37889 1.08611 2.9978 1.47345C2.61677 1.8608 2.38163 2.39548 2.38159 2.98712C2.38159 3.57888 2.61665 4.1144 2.9978 4.50177C3.37898 4.88824 3.90465 5.12773 4.48511 5.12775C5.06568 5.12775 5.59134 4.88894 5.97241 4.50177C6.35355 4.11438 6.5896 3.57888 6.5896 2.98712C6.58956 2.39544 6.35351 1.86079 5.97241 1.47345C5.59129 1.08611 5.06583 0.847473 4.48511 0.847473Z" fill="white" stroke="white" strokeWidth="0.2"/>
            </svg>
            Preparar clase
          </Link>
        </div>
      </div>

      <div className="rounded-2xl card-shadow p-6 mb-15">
        <div className="flex items-center gap-2 mb-6">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span className="text-sm font-medium text-brand-label">Datos generales</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-xl bg-brand-border/20 px-4 py-6 text-center">
            <p className="text-4xl font-bold text-primary">{stats.activeStudentsCount}</p>
            <p className="text-xs text-brand-label mt-1">Alumnos activos</p>
          </div>
          <div className="rounded-xl bg-brand-border/20 px-4 py-6 text-center">
            <p className="text-4xl font-bold text-brand-brown">{stats.assignedClassesCount}</p>
            <p className="text-xs text-brand-label mt-1">Clases/Semana</p>
          </div>
          <div className="rounded-xl bg-brand-border/20 px-4 py-6 text-center">
            <p className="text-4xl font-bold text-brand-brown">{stats.averageGrade ?? '—'}</p>
            <p className="text-xs text-brand-label mt-1">Nota media de grupos</p>
          </div>
        </div>

        <p className="text-xs text-brand-label mt-6">
          Última atualización: {formatFullDate(now)}
        </p>
      </div>

      <CalendarClient
        role={session?.userType ?? 'teacher'}
        userId={session?.userId ?? ''}
        initialEvents={events}
        classes={classes}
        embedded
      />
    </div>
  );
}
