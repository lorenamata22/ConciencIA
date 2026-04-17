'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Logo from '@/assets/img/Logo.svg';
import { type ProfileType, useTheme } from './providers/theme-provider';

interface ProfileOption {
  key: ProfileType;
  label: string;
  color: string;
  textColor: string;
  icon: React.ReactNode;
  position: 'main' | 'corner';
}

const PROFILES: ProfileOption[] = [
  {
    key: 'student',
    label: 'Soy estudiante',
    color: '#85C9C3',
    textColor: '#ffffff',
    icon: <StudentIcon />,
    position: 'main',
  },
  {
    key: 'teacher',
    label: 'Soy profesor',
    color: '#C9C8EC',
    textColor: '#ffffff',
    icon: <TeacherIcon />,
    position: 'main',
  },
  {
    key: 'admin',
    label: 'Admin',
    color: '#ECECEC',
    textColor: '#686868',
    icon: <AdminIcon />,
    position: 'corner',
  },
];

export default function ProfileSelectionPage() {
  const { setProfile } = useTheme();
  const router = useRouter();

  function handleSelect(profile: ProfileType) {
    setProfile(profile);
    router.push('/login');
  }

  const mainProfiles = PROFILES.filter((p) => p.position === 'main');
  const cornerAdmin = PROFILES.find((p) => p.position === 'corner')!;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-brand-bg relative px-4">
      {/* Botão Admin — canto superior direito */}
      <div className="absolute top-6 right-6">
        <button
          onClick={() => handleSelect(cornerAdmin.key)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: cornerAdmin.color, color: cornerAdmin.textColor }}
        >
          {cornerAdmin.icon}
          {cornerAdmin.label}
        </button>
      </div>

      {/* Logo + subtítulo */}
      <div className="flex flex-col items-center gap-4 mb-14">
        <Image src={Logo} alt="ConciencIA" width={457} height={67} priority />
        <p className="text-brand-label text-base">¡Bienvenido! ¿Empezamos?</p>
      </div>

      {/* Botões de perfil principais */}
      <div className="flex flex-col sm:flex-row gap-4">
        {mainProfiles.map((p) => (
          <button
            key={p.key}
            onClick={() => handleSelect(p.key)}
            className="flex items-center justify-center gap-3 px-10 py-4 rounded-2xl text-base font-semibold transition-opacity hover:opacity-85 min-w-[200px]"
            style={{ backgroundColor: p.color, color: p.textColor }}
          >
            {p.icon}
            {p.label}
          </button>
        ))}
      </div>
    </main>
  );
}

function StudentIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3L2 8l10 5 10-5-10-5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M2 8v7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M6 10.5v5a6 6 0 0 0 12 0v-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function TeacherIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AdminIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M2 19c0-3.5 3.1-6 7-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="17" cy="15" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M17 13v2l1.5 1.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
