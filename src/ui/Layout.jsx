import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { clsx } from "clsx";

// The title row of every page: optional back arrow, title, subtitle and actions.
export const PageHeader = ({ title, subtitle, back = false, actions, className }) => {
    const navigate = useNavigate();
    return (
        <div className={clsx("mb-6 flex flex-wrap items-center justify-between gap-4", className)}>
            <div className="flex min-w-0 items-center gap-3">
                {back && (
                    <button
                        type="button"
                        onClick={() => (typeof back === "string" ? navigate(back) : navigate(-1))}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-700"
                        aria-label="رجوع"
                    >
                        <ArrowRight className="h-4 w-4" />
                    </button>
                )}
                <div className="min-w-0">
                    <h1 className="truncate text-xl font-bold text-slate-900 sm:text-2xl">{title}</h1>
                    {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
                </div>
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
};

const TONES = {
    blue: "bg-brand-50 text-brand-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    violet: "bg-violet-50 text-violet-600",
    gray: "bg-slate-100 text-slate-600",
};

// A number with a label, for dashboards and summaries.
export const StatCard = ({ label, value, icon: Icon, tone = "blue", hint, loading }) => (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            {Icon && (
                <span className={clsx("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", TONES[tone])}>
                    <Icon className="h-[18px] w-[18px]" />
                </span>
            )}
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {loading ? <span className="inline-block h-7 w-16 animate-pulse rounded bg-slate-100" /> : value}
        </p>
        {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
);

// Underlined tabs: [{ key, label, count }]
export const Tabs = ({ tabs, value, onChange, className }) => (
    <div className={clsx("flex gap-1 overflow-x-auto overflow-y-hidden border-b border-slate-200", className)}>
        {tabs.map((tab) => (
            <button
                key={tab.key}
                type="button"
                onClick={() => onChange(tab.key)}
                className={clsx(
                    "-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition",
                    value === tab.key
                        ? "border-brand-600 text-brand-700"
                        : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700",
                )}
            >
                {tab.label}
                {tab.count !== undefined && (
                    <span className={clsx("rounded-full px-1.5 text-xs", value === tab.key ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-500")}>
                        {tab.count}
                    </span>
                )}
            </button>
        ))}
    </div>
);
