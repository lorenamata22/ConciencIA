'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export const PROFILE_COLORS: Record<string, { base: string; hover: string; text: string }> = {
  student: { base: '#85C9C3', hover: '#6BB5AF', text: '#ffffff' },
  teacher: { base: '#C9C8EC', hover: '#B5B4E0', text: '#ffffff' },
  admin:   { base: '#ECECEC', hover: '#D8D8D8', text: '#5F5E5C' },
};

export type ProfileType = keyof typeof PROFILE_COLORS;

const STORAGE_KEY = 'conciencia:profile';

interface ThemeContextValue {
  profile: ProfileType;
  primaryColor: string;
  setProfile: (profile: ProfileType) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  profile: 'student',
  primaryColor: PROFILE_COLORS.student.base,
  setProfile: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<ProfileType>('student');

  function applyColor(p: ProfileType) {
    const colors = PROFILE_COLORS[p];
    document.documentElement.style.setProperty('--color-primary', colors.base);
    document.documentElement.style.setProperty('--color-primary-hover', colors.hover);
    document.documentElement.style.setProperty('--color-primary-text', colors.text);
  }

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ProfileType | null;
    if (saved && saved in PROFILE_COLORS) {
      setProfileState(saved);
      applyColor(saved);
    }
  }, []);

  function setProfile(p: ProfileType) {
    setProfileState(p);
    applyColor(p);
    localStorage.setItem(STORAGE_KEY, p);
  }

  return (
    <ThemeContext.Provider
      value={{ profile, primaryColor: PROFILE_COLORS[profile].base, setProfile }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
