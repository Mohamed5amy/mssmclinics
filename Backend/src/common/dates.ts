const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Formats a date as `YYYY-MM-DD`, the format the dashboard's date inputs use. */
export function toDateString(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Formats a date as `HH:mm`. */
export function toTimeString(value: Date): string {
  return `${`${value.getHours()}`.padStart(2, '0')}:${`${value.getMinutes()}`.padStart(2, '0')}`;
}

/**
 * Reads a date the way the dashboard means it. `new Date('2026-10-20')` is UTC
 * midnight, which is the previous evening west of Greenwich, so a bare
 * `YYYY-MM-DD` is read as local midnight instead.
 */
export function parseDate(value: Date | string): Date {
  return typeof value === 'string' && DATE_ONLY.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
}

/** Whether a string is a bare `YYYY-MM-DD` day with no time part. */
export const isDateOnly = (value: string): boolean => DATE_ONLY.test(value);

export const isSameDay = (a: Date | string, b: Date | string): boolean =>
  toDateString(parseDate(a)) === toDateString(parseDate(b));

export const startOfDay = (value: Date | string): Date => {
  const date = parseDate(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const endOfDay = (value: Date | string): Date => {
  const date = parseDate(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

/**
 * Builds a Mongo range filter from the dashboard's `start_date` / `end_date`
 * query params. Both ends are inclusive; either may be omitted.
 */
export function dateRangeFilter(start?: string, end?: string): Record<string, Date> | undefined {
  if (!start && !end) return undefined;

  return {
    ...(start ? { $gte: startOfDay(start) } : {}),
    ...(end ? { $lte: endOfDay(end) } : {}),
  };
}
