import {
    BellRing,
    Building2,
    CalendarClock,
    CalendarDays,
    HandCoins,
    Headset,
    Hospital,
    LayoutDashboard,
    ListOrdered,
    Settings,
    Stethoscope,
    Users,
    Wallet,
} from "lucide-react";

// The menu, by the role name the API returns. Sections only show when they have items.
export const NAV = [
    {
        section: null,
        items: [
            { to: "/insights", label: "لوحة التحكم", icon: LayoutDashboard, roles: ["admin", "owner"] },
            { to: "/groups", label: "المجموعات", icon: Building2, roles: ["admin"] },
        ],
    },
    {
        section: "العمل اليومي",
        items: [
            { to: "/queue", label: "الدور", icon: ListOrdered, roles: ["owner", "receptionist", "doctor"] },
            { to: "/reservations-list", label: "الكشوفات", icon: CalendarDays, roles: ["admin", "owner", "receptionist", "doctor"] },
            { to: "/schedules", label: "مواعيد الدكاترة", icon: CalendarClock, roles: ["owner", "receptionist"] },
            { to: "/schedules", label: "مواعيدي", icon: CalendarClock, roles: ["doctor"] },
            { to: "/patients-list", label: "المرضى", icon: Users, roles: ["admin", "owner", "receptionist"] },
            { to: "/reminders", label: "التذكيرات", icon: BellRing, roles: ["owner", "receptionist"] },
            { to: "/cash", label: "الخزنة", icon: Wallet, roles: ["owner", "receptionist"] },
            { to: "/statement", label: "حسابي", icon: HandCoins, roles: ["doctor"] },
        ],
    },
    {
        section: "الإدارة",
        items: [
            { to: "/clinics-list", label: "الفروع", icon: Hospital, roles: ["admin", "owner"] },
            { to: "/doctors-list", label: "الدكاترة", icon: Stethoscope, roles: ["admin", "owner"] },
            { to: "/receptionists", label: "الاستقبال", icon: Headset, roles: ["admin", "owner"] },
            { to: "/statement", label: "حسابات الدكاترة", icon: HandCoins, roles: ["owner"] },
            { to: "/settings", label: "الإعدادات", icon: Settings, roles: ["owner"] },
        ],
    },
];

export const ROLE_LABELS = {
    admin: "إدارة المنصة",
    owner: "صاحب المجموعة",
    receptionist: "استقبال",
    doctor: "دكتور",
};

export const navFor = (role) =>
    NAV.map((group) => ({ ...group, items: group.items.filter((item) => item.roles.includes(role)) })).filter(
        (group) => group.items.length,
    );
