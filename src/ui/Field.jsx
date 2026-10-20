import { forwardRef } from "react";
import { clsx } from "clsx";

// A labelled form control with its error or hint underneath.
export const Field = ({ label, required, error, hint, className, children }) => (
    <label className={clsx("block", className)}>
        {label && (
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
                {label}
                {required && <span className="text-red-500"> *</span>}
            </span>
        )}
        {children}
        {error ? (
            <span className="mt-1.5 block text-xs font-medium text-red-600">{error}</span>
        ) : (
            hint && <span className="mt-1.5 block text-xs text-slate-500">{hint}</span>
        )}
    </label>
);

// Full width unless the caller sets a width of its own (w-auto, w-32, ...).
const width = (className) => (/(^|\s)w-/.test(className || "") ? "" : "w-full");

const control = (invalid) =>
    clsx(
        "block rounded-lg border bg-white px-3 text-sm text-slate-800 shadow-sm transition",
        "placeholder:text-slate-400 focus:outline-none focus:ring-2",
        "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
        invalid
            ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
            : "border-slate-200 focus:border-brand-500 focus:ring-brand-500/20",
    );

export const Input = forwardRef(function Input({ className, invalid, ...props }, ref) {
    return <input ref={ref} className={clsx(control(invalid), width(className), "h-10", className)} {...props} />;
});

export const Select = forwardRef(function Select({ className, invalid, children, ...props }, ref) {
    return (
        <select ref={ref} className={clsx(control(invalid), width(className), "h-10 pe-3", className)} {...props}>
            {children}
        </select>
    );
});

export const Textarea = forwardRef(function Textarea({ className, invalid, rows = 4, ...props }, ref) {
    return <textarea ref={ref} rows={rows} className={clsx(control(invalid), width(className), "py-2.5 leading-relaxed", className)} {...props} />;
});

// A row of choices (e.g. booked / walk-in), as one segmented control.
export const Segmented = ({ options, value, onChange, className }) => (
    <div className={clsx("inline-flex rounded-lg bg-slate-100 p-1", className)}>
        {options.map((option) => (
            <button
                key={option.id}
                type="button"
                onClick={() => onChange(option.id)}
                className={clsx(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition",
                    value === option.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700",
                )}
            >
                {option.name}
            </button>
        ))}
    </div>
);

export const Checkbox = ({ label, checked, onChange, disabled }) => (
    <label className={clsx("inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700", disabled && "cursor-not-allowed opacity-60")}>
        <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
        {label}
    </label>
);

export const Switch = ({ checked, onChange, label, disabled }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="inline-flex items-center gap-3 text-sm font-medium text-slate-700 disabled:opacity-50"
    >
        <span className={clsx("relative h-6 w-11 rounded-full transition", checked ? "bg-brand-600" : "bg-slate-200")}>
            <span
                className={clsx(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                    checked ? "start-[1.375rem]" : "start-0.5",
                )}
            />
        </span>
        {label}
    </button>
);
