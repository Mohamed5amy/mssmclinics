import { dayString } from "../constants/visits";

// Doctors' working hours on the dashboard. Times are "HH:mm" (a period may end
// at "24:00"); the week starts on Saturday, as at an Egyptian clinic.

// By JavaScript's day number (0 = Sunday).
export const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
export const SHORT_DAY_NAMES = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
export const DAY_LETTERS = ["ح", "ن", "ث", "ر", "خ", "ج", "س"];

// The days of the week in the order the calendar shows them.
export const WEEK = [6, 0, 1, 2, 3, 4, 5];

export const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

// Where a day's hours come from.
export const DAY_SOURCES = {
    weekly: { name: "حسب الجدول الأسبوعي", tone: "gray" },
    custom: { name: "مواعيد مختلفة", tone: "violet" },
    closed: { name: "إجازة", tone: "red" },
};

// How long an appointment can be, in minutes (the API accepts these).
export const SLOT_LENGTHS = [10, 15, 20, 30, 45, 60];

export const toMinutes = (time) => +time.slice(0, 2) * 60 + +time.slice(3, 5);
export const fromMinutes = (minutes) =>
    `${`${Math.floor(minutes / 60)}`.padStart(2, "0")}:${`${minutes % 60}`.padStart(2, "0")}`;

// "16:30" -> "4:30 م"; `short` drops ":00" ("4 م").
export const formatTime = (time, short = false) => {
    if (!time) return "";
    const minutes = toMinutes(time) % (24 * 60);
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    const clock = `${hours % 12 || 12}${short && !rest ? "" : `:${`${rest}`.padStart(2, "0")}`}`;
    return `${clock} ${hours < 12 ? "ص" : "م"}`;
};

// "10 ص - 2 م، 5 م - 8 م"
export const formatPeriods = (periods, short = true) =>
    periods.map((period) => `${formatTime(period.start, short)} - ${formatTime(period.end, short)}`).join("، ");

// The times a period can start or end at, every 15 minutes.
export const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => fromMinutes(i * 15));
export const END_OPTIONS = [...TIME_OPTIONS.slice(1), "24:00"];

const overlaps = (a, b) => toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end);

// What is wrong with one day's periods, in Arabic, if anything.
export const periodsProblem = (periods) => {
    const sorted = [...periods].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
    for (const [i, period] of sorted.entries()) {
        if (toMinutes(period.end) <= toMinutes(period.start)) return "الفترة لازم تخلص بعد ما تبدأ";
        if (i > 0 && overlaps(sorted[i - 1], period)) return "فيه فترتين متداخلين";
    }
    return null;
};

// How many appointments a day's periods hold.
export const slotCount = (periods, slotMinutes) =>
    periods.reduce((sum, period) => sum + Math.max(Math.floor((toMinutes(period.end) - toMinutes(period.start)) / slotMinutes), 0), 0);

// A weekly timetable in a few lines: days with the same hours share one,
// a run of three or more days reads "السبت - الخميس".
export const weekSummary = (hours) => {
    const groups = new Map();
    for (const weekday of WEEK) {
        const periods = hours.filter((h) => h.weekday === weekday);
        if (!periods.length) continue;
        const key = formatPeriods([...periods].sort((a, b) => toMinutes(a.start) - toMinutes(b.start)));
        groups.set(key, [...(groups.get(key) ?? []), weekday]);
    }
    return [...groups].map(([text, weekdays]) => {
        const positions = weekdays.map((weekday) => WEEK.indexOf(weekday));
        const run = positions.every((position, i) => i === 0 || position === positions[i - 1] + 1);
        const days =
            run && weekdays.length >= 3
                ? `${DAY_NAMES[weekdays[0]]} - ${DAY_NAMES[weekdays[weekdays.length - 1]]}`
                : weekdays.map((weekday) => DAY_NAMES[weekday]).join("، ");
        return { days, hours: text };
    });
};

// A month as calendar cells, whole weeks from Saturday: "YYYY-MM-DD" days,
// including the neighbouring months' days that fill the first and last weeks.
export const monthCells = ({ year, month }) => {
    const offset = (new Date(year, month, 1).getDay() + 1) % 7;
    const days = new Date(year, month + 1, 0).getDate();
    const count = Math.ceil((offset + days) / 7) * 7;
    return Array.from({ length: count }, (_, i) => dayString(new Date(year, month, 1 - offset + i)));
};

export const monthOf = (day) => ({ year: +day.slice(0, 4), month: +day.slice(5, 7) - 1 });
export const weekdayOf = (day) => new Date(`${day}T00:00:00`).getDay();

// "الثلاثاء 20 أكتوبر"
export const dayTitle = (day) => `${DAY_NAMES[weekdayOf(day)]} ${+day.slice(8)} ${MONTHS[+day.slice(5, 7) - 1]}`;
