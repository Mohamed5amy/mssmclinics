/**
 * Doctors' working hours as plain functions, kept free of database access so
 * the seed script lays out its demo bookings by the same rules the API checks.
 *
 * Times are "HH:mm" in the clinic's local time; a period may end at "24:00".
 * A day's hours come from the doctor's weekly timetable at the branch, unless
 * that date has an exception: a day off, or different hours.
 */

/** One stretch of working time, e.g. 16:00-21:00. */
export interface Period {
  start: string;
  end: string;
}

/** A period on a day of the week (0 = Sunday ... 6 = Saturday, as `Date#getDay`). */
export interface WeeklyPeriod extends Period {
  weekday: number;
}

export interface DayException {
  closed: boolean;
  hours: Period[];
}

/** The appointment lengths the desk can pick, in minutes. */
export const SLOT_LENGTHS = [10, 15, 20, 30, 45, 60];
export const DEFAULT_SLOT_MINUTES = 20;

export const toMinutes = (time: string): number => +time.slice(0, 2) * 60 + +time.slice(3, 5);

export const fromMinutes = (minutes: number): string =>
  `${`${Math.floor(minutes / 60)}`.padStart(2, '0')}:${`${minutes % 60}`.padStart(2, '0')}`;

/** The weekday of a "YYYY-MM-DD" day, in local time. */
export const weekdayOf = (day: string): number => new Date(`${day}T00:00:00`).getDay();

/** Every "YYYY-MM-DD" day from `start` to `end`, both included. */
export function eachDay(start: string, end: string): string[] {
  const days: string[] = [];
  const date = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  while (date <= last) {
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    days.push(`${date.getFullYear()}-${month}-${day}`);
    date.setDate(date.getDate() + 1);
  }
  return days;
}

export const overlaps = (a: Period, b: Period): boolean =>
  toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end);

export const byStart = <T extends Period>(periods: T[]): T[] =>
  [...periods].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));

/** What is wrong with one day's periods, if anything: one ending before it starts, or two overlapping. */
export function periodsProblem(periods: Period[]): string | null {
  const sorted = byStart(periods);
  for (const [i, period] of sorted.entries()) {
    if (toMinutes(period.end) <= toMinutes(period.start)) return 'A period must end after it starts';
    if (i > 0 && overlaps(sorted[i - 1], period)) return 'Two periods on the same day overlap';
  }
  return null;
}

/** The hours that apply on a day: its exception if it has one, otherwise its weekday's. */
export function hoursOn(day: string, weekly: WeeklyPeriod[], exception?: DayException | null): Period[] {
  if (exception) return exception.closed ? [] : byStart(exception.hours.map(({ start, end }) => ({ start, end })));
  const weekday = weekdayOf(day);
  return byStart(weekly.filter((period) => period.weekday === weekday).map(({ start, end }) => ({ start, end })));
}

/** The appointment start times a day's hours give: one every `slotMinutes`, while a whole slot fits. */
export function slotTimes(hours: Period[], slotMinutes: number): string[] {
  const times: string[] = [];
  for (const period of byStart(hours)) {
    const end = toMinutes(period.end);
    for (let start = toMinutes(period.start); start + slotMinutes <= end; start += slotMinutes) {
      times.push(fromMinutes(start));
    }
  }
  return times;
}

/** The slot a time falls in (its start time), or null when the time is outside the hours. */
export function slotOf(time: string, hours: Period[], slotMinutes: number): string | null {
  const minutes = toMinutes(time);
  for (const period of hours) {
    const start = toMinutes(period.start);
    const end = toMinutes(period.end);
    if (minutes >= start && minutes < end) {
      const slot = start + Math.floor((minutes - start) / slotMinutes) * slotMinutes;
      return slot + slotMinutes <= end ? fromMinutes(slot) : null;
    }
  }
  return null;
}

/** Whether a time is within the hours at all (a looser test than being on a slot). */
export const withinHours = (time: string, hours: Period[]): boolean =>
  hours.some((period) => toMinutes(time) >= toMinutes(period.start) && toMinutes(time) < toMinutes(period.end));
