const UTC_DAY_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function addUtcDays(date: Date, days: number): Date {
  const start = startOfUtcDay(date);
  start.setUTCDate(start.getUTCDate() + days);
  return start;
}

export function toUtcDayKey(date: Date): string {
  const start = startOfUtcDay(date);
  return start.toISOString().slice(0, 10);
}

export function parseUtcDayKey(dayKey: string): Date {
  if (!UTC_DAY_KEY_REGEX.test(dayKey)) {
    throw new Error(`Invalid UTC day key: ${dayKey}`);
  }

  const [year, month, day] = dayKey.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (Number.isNaN(parsed.getTime()) || toUtcDayKey(parsed) !== dayKey) {
    throw new Error(`Invalid UTC day key: ${dayKey}`);
  }

  return parsed;
}

export function formatUtcDayLabel(dayKey: string): string {
  const date = parseUtcDayKey(dayKey);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
