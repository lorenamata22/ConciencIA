import { useEffect, useState } from "react";

interface LoginErrorProps {
  message?: string;
  onClose?: () => void;
  className?: string;
}

export function LoginError({
  message = "Email ou senha incorretos.",
  onClose,
  className = "",
}: LoginErrorProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
  }, [message]);

  if (!visible) return null;

  const handleClose = () => {
    setVisible(false);
    onClose?.();
  };

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-xl px-4 py-5 text-sm login-alert ${className}`}
    >
      <span className="mt-0.5 text-black-800 flex-shrink-0">
        <svg width="31" height="28" viewBox="0 0 31 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g clipPath="url(#clip0_457_1408)">
          <path d="M30.4072 21.5102L19.0876 2.07407C18.3373 0.769414 16.9998 0 15.4992 0C13.9987 0 12.6612 0.769414 11.9109 2.07407L0.591326 21.5102C-0.191585 22.8483 -0.191585 24.454 0.558704 25.8256C1.30899 27.1971 2.67909 28 4.17967 28H26.8188C28.352 28 29.6895 27.1971 30.4398 25.8256C31.1901 24.454 31.1901 22.8483 30.4072 21.5102ZM15.4992 23.4504C14.5206 23.4504 13.7377 22.6476 13.7377 21.644C13.7377 20.6404 14.5206 19.8375 15.4992 19.8375C16.4779 19.8375 17.2608 20.6404 17.2608 21.644C17.2608 22.6476 16.4779 23.4504 15.4992 23.4504ZM17.3913 9.70131L16.7715 17.1613C16.7062 17.8638 16.0864 18.399 15.4014 18.3321C14.7816 18.2652 14.2923 17.7634 14.2596 17.1613L13.6398 9.70131C13.542 8.63083 14.3249 7.69415 15.3688 7.59379C16.4126 7.49343 17.326 8.2963 17.4239 9.36679C17.3913 9.46714 17.3913 9.60096 17.3913 9.70131Z" fill="black"/>
          </g>
          <defs>
          <clipPath id="clip0_457_1408">
          <rect width="31" height="28" fill="white"/>
          </clipPath>
          </defs>
        </svg>

      </span>

      <div className="flex-1 px-3">
        <p>{message}</p>
        <a
          href="/forgot-password"
          className="mt-1 text-xs underline underline-offset-2"
        >
          Restablecer contraseña
        </a>
      </div>

      <button
        onClick={handleClose}
        aria-label="Fechar alerta"
        className="ml-auto flex-shrink-0 cursor-pointer"
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" clipRule="evenodd" d="M0.237916 1.3869C-0.0793054 1.06968 -0.0793054 0.555138 0.237916 0.237916C0.555138 -0.0793054 1.06968 -0.0793054 1.3869 0.237916L6.5 5.35101L11.6131 0.237916C11.9303 -0.0793054 12.4449 -0.0793054 12.7621 0.237916C13.0793 0.555138 13.0793 1.06968 12.7621 1.3869L7.64899 6.5L12.7621 11.6131C13.0793 11.9303 13.0793 12.4449 12.7621 12.7621C12.4449 13.0793 11.9303 13.0793 11.6131 12.7621L6.5 7.64899L1.3869 12.7621C1.06968 13.0793 0.555138 13.0793 0.237916 12.7621C-0.0793054 12.4449 -0.0793054 11.9303 0.237916 11.6131L5.35101 6.5L0.237916 1.3869Z" fill="black"/>
        </svg>
      </button>
    </div>
  );
}
