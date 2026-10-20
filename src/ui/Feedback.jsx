import { Loader2 } from "lucide-react";
import { clsx } from "clsx";

export const Spinner = ({ className }) => <Loader2 className={clsx("h-5 w-5 animate-spin text-brand-600", className)} />;

export const PageLoader = () => (
    <div className="flex justify-center py-20">
        <Spinner className="h-7 w-7" />
    </div>
);

// Shown when a list has nothing in it yet.
export const EmptyState = ({ icon: Icon, title, text, action, className }) => (
    <div className={clsx("flex flex-col items-center px-6 py-14 text-center", className)}>
        {Icon && (
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Icon className="h-6 w-6" />
            </div>
        )}
        <p className="font-medium text-slate-900">{title}</p>
        {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
        {action && <div className="mt-5">{action}</div>}
    </div>
);

const ALERT_TONES = {
    info: "border-brand-200 bg-brand-50 text-brand-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    error: "border-red-200 bg-red-50 text-red-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

export const Alert = ({ tone = "info", icon: Icon, title, children, className }) => (
    <div className={clsx("flex gap-3 rounded-xl border px-4 py-3 text-sm", ALERT_TONES[tone], className)}>
        {Icon && <Icon className="mt-0.5 h-5 w-5 shrink-0" />}
        <div className="min-w-0 flex-1">
            {title && <p className="font-semibold">{title}</p>}
            {children && <div className={clsx(title && "mt-0.5")}>{children}</div>}
        </div>
    </div>
);
