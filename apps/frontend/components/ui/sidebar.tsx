'use client';

import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { logoutAction } from '@/app/actions/auth';

type UserType = 'student' | 'teacher' | 'institution' | 'super_admin';

interface NavItem {
  name: string;
  href: string;
  Icon: React.ComponentType<{ className?: string }>;
  roles: UserType[];
}

interface NavSection {
  label: string;
  items: NavItem[];
}

/* ── Ícones ───────────────────────────────────────────────────── */

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      <polyline points="9 21 9 12 15 12 15 21" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function BookOpenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      <line x1="12" y1="7" x2="12" y2="21" />
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  );
}

function CheckSquareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className}  width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9.698 0.100342V0.101318L9.69995 0.100342L10.1931 0.112061C15.2631 0.369268 19.2996 4.56735 19.2996 9.69995C19.2996 12.2534 18.2998 14.5741 16.6716 16.2947C16.6703 16.2963 16.6705 16.2986 16.6697 16.2996C16.6667 16.3031 16.6636 16.3056 16.6628 16.3064L16.6619 16.3054C16.6492 16.3208 16.6357 16.3351 16.6208 16.3484L16.6218 16.3494C14.8743 18.1672 12.4181 19.2996 9.69995 19.2996C4.40107 19.2994 0.100342 14.9979 0.100342 9.69995C0.100342 4.40219 4.40025 0.103095 9.69702 0.101318V0.100342H9.698ZM9.69995 10.3367C6.45359 10.3368 3.80838 12.7646 3.45874 15.9119C5.05317 17.5138 7.25866 18.5065 9.69995 18.5066C12.1423 18.5066 14.3496 17.5126 15.9441 15.9089C15.5934 12.7632 12.9455 10.3367 9.69995 10.3367ZM9.69995 0.893311C4.83328 0.893809 0.894287 4.83335 0.894287 9.69995C0.894287 11.756 1.59908 13.6452 2.77808 15.1433C3.31888 12.5809 5.24052 10.5364 7.7312 9.81909C6.51394 9.13055 5.69034 7.82421 5.69019 6.32788C5.69019 4.1167 7.48858 2.31527 9.69995 2.31519C11.9113 2.31519 13.7117 4.11655 13.7117 6.32788C13.7115 7.82453 12.8865 9.13067 11.6687 9.81909C14.1599 10.5355 16.0822 12.5793 16.6238 15.1414C17.8025 13.6439 18.5066 11.7559 18.5066 9.69995C18.5066 4.83304 14.567 0.893311 9.69995 0.893311ZM9.69995 3.10913C7.92001 3.10932 6.48511 4.54773 6.48511 6.32788C6.48534 8.10771 7.91998 9.54254 9.69995 9.54272C11.4802 9.54272 12.9175 8.10782 12.9177 6.32788C12.9177 4.54763 11.4802 3.10913 9.69995 3.10913Z" fill="currentColor" stroke="currentColor" stroke-width="0.2"/>
    </svg>

  );
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function PlusSquareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

/* Marca do elefante ConciencIA */
function ElephantMark() {
  return (
  <svg width="65" height="51" viewBox="0 0 65 51" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g clipPath="url(#clip0_217_1382)">
    <path d="M45.8785 0H10.856C4.86047 0 0 4.85585 0 10.8456V51H13.984C13.0608 50.1645 12.4689 48.9763 12.4689 47.6362V37.3222C12.4689 35.3039 14.1089 33.6654 16.1292 33.6654C18.1494 33.6654 19.7895 35.3039 19.7895 37.3222V51H44.8793V33.112C44.8793 29.7319 47.6218 26.9974 50.9997 26.9974H51.7817C55.165 26.9974 57.9021 29.7373 57.9021 33.112V41.31C57.9021 42.8997 56.615 44.1855 55.0238 44.1855H51.7817V51H57.989C61.8611 51 65.0054 47.864 65.0054 43.9902V19.0979C65 8.55064 56.4358 0 45.8785 0ZM16.1346 29.1351C14.4239 29.1351 13.0391 27.7516 13.0391 26.0426C13.0391 24.3335 14.4239 22.95 16.1346 22.95C17.8453 22.95 19.2301 24.3335 19.2301 26.0426C19.2301 27.7516 17.8453 29.1351 16.1346 29.1351ZM50.9779 16.0867C50.5761 17.7523 48.898 18.7723 47.2308 18.3709C45.5635 17.9694 44.5426 16.2929 44.9444 14.6272C45.3463 12.9616 47.0244 11.9416 48.6916 12.3431C50.3588 12.7446 51.3798 14.4211 50.9779 16.0867Z" fill="#413124"/>
    </g>
    <defs>
    <clipPath id="clip0_217_1382">
    <rect width="65" height="51" fill="white"/>
    </clipPath>
    </defs>
  </svg>
  );
}

/* ── Configuração da navegação ────────────────────────────────── */

const NAV_SECTIONS_MENU: NavSection[] = [
  {
    label: 'HOME',
    items: [
      { name: 'Chat',          href: '/student',           Icon: HomeIcon,       roles: ['student'] },
      { name: 'Mis archivos',  href: '/student/files',     Icon: FolderIcon,     roles: ['student'] },
      { name: 'Mis apuntes',   href: '/student/notes',     Icon: PencilIcon,     roles: ['student'] },
      { name: 'Asignaturas',   href: '/student/subjects',  Icon: BookIcon,       roles: ['student'] },
      { name: 'Inicio',        href: '/teacher',           Icon: HomeIcon,       roles: ['teacher'] },
      { name: 'Preparar aulas',href: '/teacher/lessons',   Icon: BookOpenIcon,   roles: ['teacher'] },
      { name: 'Materiales',    href: '/teacher/materials', Icon: FolderIcon,     roles: ['teacher'] },
      { name: 'Actividades',   href: '/teacher/activities',Icon: CheckSquareIcon,roles: ['teacher'] },
      { name: 'Notas',         href: '/teacher/grades',    Icon: ClipboardIcon,  roles: ['teacher'] },
      { name: 'Home',        href: '/institution',          Icon: HomeIcon,       roles: ['institution'] },
      { name: 'Usuarios',    href: '/institution/users',    Icon: UserIcon,       roles: ['institution'] },
      { name: 'Cursos',      href: '/institution/courses',  Icon: BookIcon,       roles: ['institution'] },
      { name: 'Asignaturas', href: '/institution/subjects', Icon: BookOpenIcon,   roles: ['institution'] },
      { name: 'Turmas',      href: '/institution/classes',  Icon: UsersIcon,      roles: ['institution'] },
      { name: 'Profesores',    href: '/institution/teachers', Icon: UserIcon,    roles: ['institution'] },
      { name: 'Alumnos',       href: '/institution/students', Icon: UserIcon,    roles: ['institution'] },
      { name: 'Notas',         href: '/institution/grades',   Icon: ClipboardIcon,roles: ['institution'] },
      { name: 'Inicio',        href: '/admin', Icon: HomeIcon, roles: ['super_admin'] },
      { name: 'Instituciones',    href: '/admin/institutions', Icon: BuildingIcon, roles: ['super_admin'] },
      { name: 'Nueva institución', href: '/admin/institutions/new', Icon: PlusSquareIcon, roles: ['super_admin'] },
    ],
  }
];

const NAV_SECTIONS_CONFG: NavSection[] = [
  {
    label: 'CONFIGURACIONES',
    items: [
      {
        name: 'Ajustes',
        href: '/settings',
        Icon: SettingsIcon,
        roles: ['student', 'teacher', 'institution', 'super_admin'],
      },
    ],
  }
];

/* ── Componente principal ─────────────────────────────────────── */

interface SidebarProps {
  userName: string;
  userType: string;
}

export function Sidebar({ userName, userType }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const role = userType as UserType;
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await logoutAction();
      router.push('/login');
    });
  }

  // Fecha automaticamente ao passar para desktop
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    function handleChange(e: MediaQueryListEvent) {
      if (e.matches) setIsOpen(false);
    }
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  // Fecha ao navegar para outra rota (mobile)
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const activeKey = (() => {
    const allItems = [...NAV_SECTIONS_MENU, ...NAV_SECTIONS_CONFG]
      .flatMap((s) => s.items.filter((i) => i.roles.includes(role)));

    const best = allItems.reduce<NavItem | null>((acc, item) => {
      const matches =
        item.href === pathname ||
        (item.href !== '/' && pathname.startsWith(item.href + '/'));
      if (!matches) return acc;
      if (!acc || item.href.length > acc.href.length) return item;
      return acc;
    }, null);

    return best ? best.href + best.name : null;
  })();

  function renderNavSection(sections: NavSection[]) {
    return sections.map((section) => {
      const visibleItems = section.items.filter((item) => item.roles.includes(role));
      if (visibleItems.length === 0) return null;

      return (
        <div key={section.label}>
          <p className="text-[16px] font-semibold tracking-widest uppercase mb-3">
            {section.label}
          </p>
          <ul className="flex flex-col gap-0.5">
            {visibleItems.map((item) => {
              const active = activeKey === item.href + item.name;
              return (
                <li key={item.href + item.name}>
                  <Link
                    href={item.href}
                    className={`
                      flex items-center gap-3 px-2 py-2 rounded-lg text-base transition-colors
                      ${active ? 'bg-primary/10 text-primary font-medium' : 'text-brand-brown hover:text-brand-brown/70'}
                    `}
                  >
                    <item.Icon className={active ? 'text-primary' : 'text-brand-label'} />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      );
    });
  }

  return (
    <>
      {/* Botão hamburger — visível apenas em mobile */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`lg:hidden fixed top-5 left-5 z-[60] p-2 rounded-lg bg-white shadow-sm text-brand-brown hover:text-brand-brown/70 transition-colors ${isOpen ? 'hidden' : 'flex'}`}
        aria-label="Abrir menu"
      >
        <MenuIcon />
      </button>

      {/* Backdrop — mobile, quando aberto */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-brand-brown/20"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          flex flex-col w-74 h-dvh px-10 py-20 lg:justify-between border-brand-border/40 flex-shrink-0
          bg-brand-bg overflow-y-auto lg:overflow-visible
          transition-transform duration-300 ease-in-out sidebar
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Botão fechar — mobile only */}
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="lg:hidden absolute top-5 right-5 p-1.5 rounded-lg text-brand-label hover:text-brand-brown transition-colors"
          aria-label="Fechar menu"
        >
          <XIcon />
        </button>

        <div>
          <div className="mb-10">
            <ElephantMark />
          </div>
          <div className="mt-11">
            <p className="text-base font-semibold text-brand-brown">
              ¡Hola, {userName || 'Usuario'}!
            </p>
          </div>
          <div>
            {role === 'student' && (
              <Link
                href="/student/cognitive-test"
                className="text-sm text-primary underline inline-block transition-colors mt-4"
              >
                Revisar test
              </Link>
            )}
          </div>
        </div>

        <div className="mt-12 lg:mt-0">
          <nav className="flex flex-col gap-8 flex-1">
            {renderNavSection(NAV_SECTIONS_MENU)}
          </nav>
        </div>

        <div className="mt-12 lg:mt-0">
          <nav className="flex flex-col gap-8 flex-1">
            {renderNavSection(NAV_SECTIONS_CONFG)}
          </nav>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isPending}
            className="flex items-center cursor-pointer gap-3 px-2 py-2 rounded-lg text-base text-red-500 hover:text-red-600 transition-colors w-full disabled:opacity-50"
          >
            <LogOutIcon className="text-red-500" />
            {isPending ? 'Saindo...' : 'Logout'}
          </button>
        </div>
      </aside>
    </>
  );
}
