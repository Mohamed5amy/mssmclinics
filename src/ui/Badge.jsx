import { clsx } from "clsx";

const TONES = {
    gray: "bg-slate-100 text-slate-700 ring-slate-500/10",
    blue: "bg-brand-50 text-brand-700 ring-brand-600/15",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
    red: "bg-red-50 text-red-700 ring-red-600/15",
    violet: "bg-violet-50 text-violet-700 ring-violet-600/15",
};

export const Badge = ({ tone = "gray", dot = false, className, children }) => (
    <span
        className={clsx(
            "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
            TONES[tone],
            className,
        )}
    >
        {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
        {children}
    </span>
);
