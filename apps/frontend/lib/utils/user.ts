// Extrai o primeiro nome e capitaliza (ex: "joão silva" -> "João")
export function formatFirstName(fullName: string): string {
  const firstName = fullName.trim().split(/\s+/)[0] ?? '';
  if (!firstName) return firstName;
  return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
}

// Iniciais do nome para avatares (ex: "María López" -> "ML")
export function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return (first + last).toUpperCase();
}
