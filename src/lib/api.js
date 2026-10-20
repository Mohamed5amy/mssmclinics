import axios from "axios";
import { forceSignOut } from "../constants/session";
import { DAY_NAMES, dayTitle } from "./hours";

// Every call goes through here: the API base URL, the signed-in token, and the
// "your session ended" handling (expired, deleted, suspended group, closed branch).
export const api = axios.create({ baseURL: import.meta.env.VITE_API });

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = "Bearer " + token;
    return config;
});

const REASONS = { GROUP_SUSPENDED: "suspended", BRANCH_CLOSED: "closed" };

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status;
        const code = error?.response?.data?.code;
        const signingIn = /login$/.test(error?.config?.url || "");

        if (!signingIn && localStorage.getItem("token") && (status === 401 || REASONS[code])) {
            forceSignOut(REASONS[code] || "expired");
        }
        return Promise.reject(error);
    },
);

// Query strings without the empty filters
const clean = (params = {}) =>
    Object.fromEntries(Object.entries(params).filter(([, value]) => value !== "" && value !== undefined && value !== null));

export const get = (url, params) => api.get(url, { params: clean(params) }).then((res) => res.data.data);
export const post = (url, body) => api.post(url, body).then((res) => res.data.data);

// The API's field errors ({ field: ["msg"] }) as { field: "msg" }, in Arabic where we know it
export const fieldErrors = (error) =>
    Object.fromEntries(Object.entries(error?.response?.data?.errors ?? {}).map(([key, list]) => [key, arabic(list?.[0])]));

const MESSAGES = {
    "This email is already registered": "هذا الايميل مسجل بالفعل",
    "Please choose a branch": "اختر الفرع",
    "This doctor doesn't work at this branch": "الدكتور ده مش بيشتغل في الفرع ده",
    "The amount is more than what is left to pay": "المبلغ اكبر من المتبقي",
    "The amount paid is more than the visit costs": "المبلغ المدفوع اكبر من المطلوب",
    "The discount cannot be more than the price": "الخصم اكبر من السعر",
    "Only a waiting visit can check in": "مينفعش تسجيل وصول لكشف مش في الانتظار",
    "This visit is not booked for today": "الكشف ده مش محجوز النهارده",
    "Suspend this group before deleting it": "اوقف المجموعة الاول قبل حذفها",
    "This branch has visits - close it instead of deleting it": "الفرع عنده كشوفات، اقفله بدل ما تحذفه",
    "The password confirmation does not match": "تأكيد كلمة المرور غير مطابق",
    "Password must be at least 6 characters": "كلمة المرور 6 خانات على الاقل",
    "Please choose a time": "اختر الميعاد",
    "This time is outside the doctor's hours": "الميعاد ده برة مواعيد الدكتور",
    "The doctor doesn't work at this branch on this day": "الدكتور مش موجود في الفرع ده اليوم ده",
    "This time is already booked": "الميعاد ده اتحجز، اختر ميعاد تاني",
    "The doctor has no free time left today": "مواعيد الدكتور النهارده خلصت",
    "This time has already passed": "الميعاد ده عدى",
    "This day has passed": "اليوم ده عدى",
    "A period must end after it starts": "الفترة لازم تخلص بعد ما تبدأ",
    "Two periods on the same day overlap": "فيه فترتين متداخلين في نفس اليوم",
    "Add the working hours, or mark the day off": "حدد المواعيد او خلي اليوم إجازة",
    "Past days can't be changed": "مينفعش تعدل يوم عدى",
    "Please choose the appointment length": "اختر مدة الكشف",
    "Some booked patients fall outside these hours - move or cancel their visits first":
        "فيه مرضى محجوزين برة المواعيد دي، انقل حجوزاتهم او الغيها الاول",
};

const arabic = (message) => MESSAGES[message] ?? message;

// Codes whose message depends on what the API says it is about.
const CODED = {
    // "The doctor already works at another branch at this time"
    HOURS_CLASH: ({ clinic, weekday, date }) =>
        `الدكتور عنده مواعيد في ${clinic || "فرع تاني"} ${date ? dayTitle(date) : `يوم ${DAY_NAMES[weekday]}`} في نفس الوقت`,
};

// A message to show for a failed call, in Arabic where we know it.
// No answer at all: the API is down or the connection dropped.
export const OFFLINE = "مفيش اتصال بالسيرفر، اتأكد من النت وحاول تاني";

export const errorMessage = (error, fallback = "حدث خطأ، حاول مرة اخري") => {
    if (error?.isAxiosError && !error.response) return OFFLINE;
    const { message, code, details } = error?.response?.data ?? {};
    if (CODED[code]) return CODED[code](details ?? {});
    if (!message) return fallback;
    if (MESSAGES[message]) return MESSAGES[message];
    if (/upcoming booking/.test(message)) return "الدكتور عنده حجوزات جاية، انقلها او الغيها الاول";
    return /[؀-ۿ]/.test(message) ? message : fallback;
};
