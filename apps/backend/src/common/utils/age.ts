// Verifica se a pessoa é menor de 18 anos na data de referência
export function isMinor(
  birthDate: Date,
  reference: Date = new Date(),
): boolean {
  const eighteenthBirthday = new Date(
    birthDate.getFullYear() + 18,
    birthDate.getMonth(),
    birthDate.getDate(),
  );
  return reference < eighteenthBirthday;
}
