function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

// Botões estáticos por enquanto — sem dropdown/dados reais até os módulos de notificação e perfil serem implementados
export function TopbarIcons({ notificationCount = 0 }: { notificationCount?: number }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label="Notificaciones"
        className="relative w-10 h-10 flex items-center justify-center rounded-full border border-brand-border text-brand-label hover:bg-brand-border/30 transition-colors"
      >
        <BellIcon />
        {notificationCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-text text-[10px] font-semibold flex items-center justify-center">
            {notificationCount}
          </span>
        )}
      </button>
      <button
        type="button"
        aria-label="Perfil"
        className="w-10 h-10 flex items-center justify-center rounded-full border border-brand-border text-brand-label hover:bg-brand-border/30 transition-colors"
      >
        <UserIcon />
      </button>
    </div>
  );
}
