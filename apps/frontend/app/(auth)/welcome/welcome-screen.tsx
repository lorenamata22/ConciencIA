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
    <svg
      width="56"
      height="56"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Corpo */}
      <ellipse cx="32" cy="36" rx="20" ry="16" fill="#3B2A1A" />
      {/* Cabeça */}
      <circle cx="32" cy="22" r="13" fill="#3B2A1A" />
      {/* Orelha esquerda */}
      <ellipse cx="16" cy="24" rx="6" ry="9" fill="#3B2A1A" />
      {/* Tromba */}
      <path
        d="M25 34 Q18 44 22 50"
        stroke="#3B2A1A"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Olho esquerdo */}
      <circle cx="26" cy="20" r="2" fill="#F8F6F1" />
      {/* Olho direito */}
      <circle cx="38" cy="20" r="2" fill="#F8F6F1" />
      {/* Patas */}
      <rect x="18" y="48" width="8" height="10" rx="4" fill="#3B2A1A" />
      <rect x="38" y="48" width="8" height="10" rx="4" fill="#3B2A1A" />
    </svg>
  );
}
