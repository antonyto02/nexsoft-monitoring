export function startOfHour(date: Date): Date {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  return d;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = (day + 6) % 7; // monday as start of week
  d.setDate(d.getDate() - diff);
  return d;
}

export function subHours(date: Date, hours: number): Date {
  const d = new Date(date);
  d.setHours(d.getHours() - hours);
  return d;
}

export function subDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}
