import { PAYMENT_METHODS, dayString, labelOf, money } from "../constants/visits";
import { dayTitle, formatTime } from "./hours";

// Messages to patients, sent from the desk's own WhatsApp: a wa.me link opens
// the chat with the text written; the desk presses send. No paid service.

// An Egyptian number in the international form wa.me wants: 01xxxxxxxxx -> 201xxxxxxxxx.
export const waPhone = (phone) => {
    const digits = (phone || "").replace(/\D/g, "");
    if (digits.startsWith("00")) return digits.slice(2);
    if (digits.startsWith("20")) return digits;
    if (digits.startsWith("0")) return "20" + digits.slice(1);
    if (digits.length === 10 && digits.startsWith("1")) return "20" + digits;
    return digits;
};

export const waLink = (phone, text) => `https://wa.me/${waPhone(phone)}?text=${encodeURIComponent(text)}`;

// "بكرة" / "النهارده" / "الأحد 25 أكتوبر"
const whenOf = (day) => {
    const today = new Date();
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    if (day === dayString(today)) return "النهارده";
    if (day === dayString(tomorrow)) return `بكرة ${dayTitle(day)}`;
    return dayTitle(day);
};

const place = (visit) => `${visit.clinicName}${visit.clinicBranch ? ` - ${visit.clinicBranch}` : ""}`;

// The visit is booked: when, with whom, where, and the turn.
export const confirmationText = (visit) =>
    [
        `أهلاً ${visit.name}،`,
        `تم حجز ميعادك في ${visit.groupName || visit.clinicName}:`,
        `📅 ${dayTitle(visit.CustomDate)}${visit.time ? ` الساعة ${formatTime(visit.time)}` : ""}`,
        `👨‍⚕️ ${visit.doctorName}`,
        `📍 ${place(visit)}`,
        `رقم الدور: ${visit.queue_number}`,
        "",
        "ياريت تيجي قبل الميعاد بـ 10 دقايق، ولو حابب تلغي او تغيّر الميعاد بلغنا.",
    ].join("\n");

// The day before (or the day of): a nudge, and a way to free the slot.
export const reminderText = (visit) =>
    [
        `أهلاً ${visit.name}،`,
        `بنفكّرك بميعادك ${whenOf(visit.CustomDate)}${visit.time ? ` الساعة ${formatTime(visit.time)}` : ""} مع ${visit.doctorName} في ${place(visit)}.`,
        "",
        "لو مش هتقدر تيجي ياريت تبلغنا عشان نديه لحد تاني. شكراً",
    ].join("\n");

// After a payment: the latest one, and where the visit's balance stands.
export const receiptText = (visit) => {
    const last = visit.payments[visit.payments.length - 1];
    return [
        `أهلاً ${visit.name}،`,
        last
            ? `استلمنا منك ${money(last.amount)} (${labelOf(PAYMENT_METHODS, last.method)}) يوم ${dayTitle(dayString(new Date(last.paid_at)))}.`
            : "",
        `الكشف: ${visit.serviceName} مع ${visit.doctorName}`,
        `المطلوب: ${money(visit.net_price)} · المدفوع: ${money(visit.paid)} · المتبقي: ${money(visit.remaining)}`,
        "",
        `شكراً لزيارتك ${visit.groupName || visit.clinicName}.`,
    ]
        .filter((line, i) => line || i > 1)
        .join("\n");
};
