'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme, type ProfileType } from '@/app/providers/theme-provider';

// Mapa de userType (JWT) → perfil de tema
const USER_TYPE_TO_PROFILE: Record<string, ProfileType> = {
  student:     'student',
  teacher:     'teacher',
  institution: 'admin',
  super_admin: 'admin',
};

// Duração total antes de redirecionar (ms)
const REDIRECT_DELAY = 4000;

// Duração do fade (ms)
const FADE_DURATION = 700;

interface WelcomeScreenProps {
  name: string;
  userType: string;
}

export function WelcomeScreen({ name, userType }: WelcomeScreenProps) {
  const router = useRouter();
  const { setProfile } = useTheme();
  const [phase, setPhase] = useState<'hidden' | 'visible' | 'leaving'>('hidden');

  useEffect(() => {
    // Aplica o tema correto conforme a role autenticada
    const profile = USER_TYPE_TO_PROFILE[userType] ?? 'student';
    setProfile(profile);

    // Fade-in
    const showTimer = setTimeout(() => setPhase('visible'), 80);
    // Inicia fade-out antes do redirect
    const leaveTimer = setTimeout(() => setPhase('leaving'), REDIRECT_DELAY - FADE_DURATION);
    // Redireciona
    const redirectTimer = setTimeout(() => router.push('/home'), REDIRECT_DELAY);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(leaveTimer);
      clearTimeout(redirectTimer);
    };
  }, [router, userType, setProfile]);

  const isVisible = phase === 'visible';

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-brand-bg relative overflow-hidden">
      {/* Saudação com animação de fade + slide */}
      <p
        className="text-4xl sm:text-5xl font-light text-brand-label select-none"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
          transition: `opacity ${FADE_DURATION}ms ease-out, transform ${FADE_DURATION}ms ease-out`,
        }}
      >
        Bienvenido{name ? `, ${name}` : ''}
      </p>

      {/* Elefante — fixado na base da tela */}
      <div
        className="absolute bottom-10"
        style={{
          opacity: isVisible ? 1 : 0,
          transition: `opacity ${FADE_DURATION}ms ease-out ${200}ms`,
        }}
      >
        <ElephantMark />
      </div>
    </main>
  );
}

/* Marca do elefante ConciencIA — ícone isolado */
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
