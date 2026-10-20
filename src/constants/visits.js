// Labels for the codes the API stores on a visit.

// Recorded by hand at the desk - there is no online payment.
export const PAYMENT_METHODS = [
    { id: "cash", name: "كاش" },
    { id: "instapay", name: "إنستاباي" },
    { id: "vodafone_cash", name: "فودافون كاش" },
    { id: "card", name: "بطاقة" },
];

export const BOOKING_TYPES = [
    { id: "walk_in", name: "بدون حجز" },
    { id: "booked", name: "حجز مسبق" },
];

// The visit statuses are stored as this Arabic text.
export const STATUS = { PENDING: "فى الانتظار", DONE: "مكتمل", CANCELED: "ملغي" };
export const STATUSES = [
    { id: STATUS.PENDING, name: "لم يكتمل", tone: "amber" },
    { id: STATUS.DONE, name: "مكتمل", tone: "green" },
    { id: STATUS.CANCELED, name: "ملغي", tone: "red" },
];
export const statusOf = (id) => STATUSES.find((status) => status.id === id) ?? { name: id, tone: "gray" };

// Where a visit stands in the day's queue.
export const QUEUE_STATES = {
    not_arrived: { name: "لم يصل", tone: "gray" },
    waiting: { name: "في الانتظار", tone: "amber" },
    with_doctor: { name: "عند الدكتور", tone: "blue" },
    done: { name: "انتهى", tone: "green" },
    canceled: { name: "ملغي", tone: "red" },
};

// The one badge a visit shows: an open visit today says where it is in the
// queue, one on a later day is upcoming; otherwise its status.
export const visitBadge = (visit) => {
    if (visit.status !== STATUS.PENDING) return statusOf(visit.status);
    if (visit.CustomDate === todayString() && QUEUE_STATES[visit.queue_state]) return QUEUE_STATES[visit.queue_state];
    if (visit.CustomDate > todayString()) return { name: "قادم", tone: "blue" };
    return statusOf(visit.status);
};

export const FOLLOWUP_MODES = [
    { id: "free", name: "مجانية" },
    { id: "percent", name: "نسبة من سعر الكشف" },
    { id: "fixed", name: "سعر ثابت" },
];

export const SEXES = [
    { id: "ذكر", name: "ذكر" },
    { id: "انثي", name: "انثى" },
];

export const labelOf = (list, id) => list.find((item) => item.id === id)?.name ?? "";

// A date as YYYY-MM-DD in local time, the format date inputs use.
export const dayString = (date = new Date()) =>
    `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;

export const todayString = () => dayString();

// The first and last day of the month a date falls in.
export const monthRange = (date = new Date()) => ({
    start: dayString(new Date(date.getFullYear(), date.getMonth(), 1)),
    end: dayString(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
});

// "2026-10-20" -> "الثلاثاء 20 أكتوبر"
export const longDate = (day) =>
    new Date(`${day}T00:00:00`).toLocaleDateString("ar-EG-u-nu-latn", { weekday: "long", day: "numeric", month: "long" });

// Amounts in EGP, grouped, without trailing .00 for whole pounds.
export const amount = (value) => (Math.round((+value || 0) * 100) / 100).toLocaleString("en-US");
export const money = (value) => `${amount(value)} جنيه`;
