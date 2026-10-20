// A number with its noun the Arabic way: 1 دفعة، 2 دفعتين، 3 دفعات … 10 دفعات، 11 دفعة.
//   counted(3, ["دفعة", "دفعتين", "دفعات"]) -> "3 دفعات"
export const counted = (n, [one, two, few]) => {
    if (n === 1) return `1 ${one}`;
    if (n === 2) return two;
    if (n >= 3 && n <= 10) return `${n} ${few}`;
    return `${n} ${one}`;
};

export const PAYMENTS = ["دفعة", "دفعتين", "دفعات"];
export const BOOKINGS = ["حجز", "حجزين", "حجوزات"];
export const VISITS = ["زيارة", "زيارتين", "زيارات"];
export const DAYS = ["يوم", "يومين", "أيام"];
