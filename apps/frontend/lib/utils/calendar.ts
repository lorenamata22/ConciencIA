// Utilitários de data para o calendário (semana começando na segunda-feira)

export const WEEKDAY_LABELS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

// Chave estável de um dia no formato YYYY-MM-DD (em horário local)
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Quantos dias deslocar para que segunda-feira seja o primeiro dia (getDay: 0=dom)
function mondayOffset(day: number): number {
  return (day + 6) % 7;
}

export interface MonthCell {
  date: Date;
  inMonth: boolean;
}

// Matriz de 6 semanas cobrindo o mês informado, com dias adjacentes para preencher
export function buildMonthMatrix(year: number, month: number): MonthCell[][] {
  const firstOfMonth = new Date(year, month, 1);
  const start = new Date(firstOfMonth);
  start.setDate(1 - mondayOffset(firstOfMonth.getDay()));

  const weeks: MonthCell[][] = [];
  const cursor = new Date(start);

  for (let w = 0; w < 6; w++) {
    const week: MonthCell[] = [];
    for (let d = 0; d < 7; d++) {
      week.push({ date: new Date(cursor), inMonth: cursor.getMonth() === month });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  return weeks;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// "Mayo de 2026"
export function monthTitle(year: number, month: number): string {
  const label = new Date(year, month, 1).toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  });
  return capitalize(label);
}

// "Martes, 5 de mayo"
export function longDate(date: Date): string {
  const label = date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return capitalize(label);
}

// "6:45pm"
export function shortTime(date: Date): string {
  return date
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase()
    .replace(' ', '');
}

// Verdadeiro se o dia (local) cai dentro do intervalo [start, end] do evento
export function dayWithinRange(day: Date, startIso: string, endIso: string): boolean {
  const key = dayKey(day);
  const startKey = dayKey(new Date(startIso));
  const endKey = dayKey(new Date(endIso));
  return key >= startKey && key <= endKey;
}
