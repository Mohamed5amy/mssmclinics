import { BOOKING_TYPES, PAYMENT_METHODS, labelOf, money, statusOf } from "../constants/visits";

// How the activity log reads in Arabic: field names, values, and what changed.

const FIELDS = {
    status: "الحالة",
    date: "اليوم",
    time: "الساعة",
    booking_type: "نوع الحجز",
    discount: "الخصم",
    price: "السعر",
    paid: "المدفوع",
    amount: "المبلغ",
    method: "طريقة الدفع",
    payment_method: "طريقة الدفع",
    override_hours: "برة مواعيد الدكتور",
    Diagnosis: "التشخيص",
    name: "الاسم",
    phone: "التليفون",
    email: "الإيميل",
    age: "السن",
    address: "العنوان",
    branch: "العنوان",
    title: "الاسم",
    note: "ملاحظة",
    prectange: "النسبة",
    chronic: "أمراض مزمنة",
    allergies: "حساسية",
    medications: "أدوية",
    notes: "ملاحظات",
    closed: "إجازة",
    slot_minutes: "مدة الكشف",
    kind: "النوع",
    file_name: "الملف",
    queue_number: "الدور",
};

const MONEY = new Set(["discount", "price", "paid", "amount"]);
const KINDS = { lab: "تحليل", radiology: "أشعة", report: "تقرير", other: "أخرى" };

const format = (key, value) => {
    if (value === null || value === undefined || value === "") return "—";
    if (MONEY.has(key)) return money(value);
    if (key === "status") return statusOf(value).name;
    if (key === "method" || key === "payment_method") return labelOf(PAYMENT_METHODS, value) || value;
    if (key === "booking_type") return labelOf(BOOKING_TYPES, value) || value;
    if (key === "kind") return KINDS[value] ?? value;
    if (key === "prectange") return `${value}%`;
    if (key === "slot_minutes") return `${value} دقيقة`;
    if (typeof value === "boolean") return value ? "أيوه" : "لأ";
    if (Array.isArray(value)) return value.length ? value.join("، ") : "—";
    if (typeof value === "string" && value.length > 80) return `${value.slice(0, 80)}…`;
    return String(value);
};

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

// The lines under an entry: what changed for an edit, what was there for a
// deletion, and the key facts of anything else.
export const describeChanges = (row) => {
    const details = row.details ?? {};
    const before = row.before ?? {};

    if (row.action === "login_failed") return details.email ? [`الإيميل: ${details.email}`] : [];

    if (row.action === "update" && row.before) {
        return Object.keys(FIELDS)
            .filter((key) => key in details && key in before && !same(details[key], before[key]))
            .map((key) => `${FIELDS[key]}: ${format(key, before[key])} ← ${format(key, details[key])}`);
    }

    const source = row.action === "delete" ? before : details;
    return Object.keys(FIELDS)
        .filter((key) => key in source && source[key] !== "" && source[key] !== null && !(Array.isArray(source[key]) && !source[key].length))
        .filter((key) => !(key === "override_hours" && !source[key]))
        .slice(0, 6)
        .map((key) => `${FIELDS[key]}: ${format(key, source[key])}`);
};

export const ACTOR_ROLES = { admin: "إدارة المنصة", owner: "صاحب المجموعة", receptionist: "استقبال", doctor: "دكتور" };
