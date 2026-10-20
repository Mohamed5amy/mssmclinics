import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { clsx } from "clsx";
import { formatTime } from "../../lib/hours";

/**
 * A day's appointment slots.
 *   mode "pick" (booking): free slots are choices, taken and past ones can't be picked.
 *   mode "view" (the schedule): taken slots open the visit; free ones open a booking
 *   for that time when `bookLink(slot)` is given.
 * As many columns as fit the space it is given, wherever it sits.
 */
const SlotGrid = ({ slots, mode = "pick", value, onPick, bookLink }) => (
    <div
        className={clsx(
            "grid gap-2",
            mode === "pick" ? "grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))]" : "grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))]",
        )}
    >
        {slots.map((slot) => {
            const time = formatTime(slot.time);

            if (mode === "pick") {
                const chosen = slot.time === value;
                return (
                    <button
                        key={slot.time}
                        type="button"
                        disabled={slot.state !== "free"}
                        onClick={() => onPick(slot.time)}
                        title={slot.state === "taken" ? "محجوز" : slot.state === "past" ? "عدى" : `${time} - ${formatTime(slot.end)}`}
                        className={clsx(
                            "h-10 whitespace-nowrap rounded-lg border text-sm font-medium transition",
                            chosen && "border-brand-600 bg-brand-600 text-white shadow-sm",
                            !chosen && slot.state === "free" && "border-slate-200 bg-white text-slate-700 hover:border-brand-400 hover:bg-brand-50",
                            slot.state === "taken" && "cursor-not-allowed border-slate-100 bg-slate-100 text-slate-400 line-through",
                            slot.state === "past" && "cursor-not-allowed border-transparent bg-transparent text-slate-300",
                        )}
                    >
                        {time}
                    </button>
                );
            }

            const base = "flex h-14 min-w-0 flex-col justify-center rounded-lg border px-2.5 text-start transition";
            if (slot.state === "taken") {
                return (
                    <Link key={slot.time} to={`/reservations-list/${slot.visit.id}`} className={clsx(base, "border-brand-200 bg-brand-50 hover:border-brand-400")}>
                        <span className="text-xs font-medium text-brand-700">{time}</span>
                        <span className="truncate text-sm font-medium text-slate-900">{slot.visit.name}</span>
                    </Link>
                );
            }
            if (slot.state === "free" && bookLink) {
                return (
                    <Link
                        key={slot.time}
                        to={bookLink(slot)}
                        className={clsx(base, "group border-dashed border-slate-300 bg-white hover:border-brand-400 hover:bg-brand-50/50")}
                    >
                        <span className="text-xs font-medium text-slate-500">{time}</span>
                        <span className="flex items-center gap-1 text-sm text-slate-400 group-hover:text-brand-700">
                            <Plus className="h-3.5 w-3.5" /> احجز
                        </span>
                    </Link>
                );
            }
            return (
                <div key={slot.time} className={clsx(base, slot.state === "past" ? "border-transparent bg-slate-50 text-slate-300" : "border-dashed border-slate-200 bg-white")}>
                    <span className="text-xs font-medium text-slate-500">{time}</span>
                    <span className="text-sm text-slate-400">{slot.state === "past" ? "عدى" : "فاضي"}</span>
                </div>
            );
        })}
    </div>
);

export default SlotGrid;
