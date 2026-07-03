// Extrai o primeiro nome e capitaliza (ex: "joão silva" -> "João")
export function formatFirstName(fullName: string): string {
  const firstName = fullName.trim().split(/\s+/)[0] ?? '';
  if (!firstName) return firstName;
  return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
}
