import { clsx } from "clsx";

export const Card = ({ className, children, ...props }) => (
    <div className={clsx("rounded-xl border border-slate-200 bg-white shadow-sm", className)} {...props}>
        {children}
    </div>
);

export const CardHeader = ({ title, description, actions, className }) => (
    <div className={clsx("flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4", className)}>
        <div className="min-w-0">
            <h3 className="font-semibold text-slate-900">{title}</h3>
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
);

export const CardBody = ({ className, children }) => <div className={clsx("p-5", className)}>{children}</div>;

// Label / value pairs, e.g. a patient's file.
export const Details = ({ items, columns = 2 }) => (
    <dl className={clsx("grid gap-x-8 gap-y-4", columns === 2 ? "sm:grid-cols-2" : columns === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "")}>
        {items
            .filter((item) => item && !item.hidden)
            .map((item) => (
                <div key={item.label} className="min-w-0">
                    <dt className="text-xs font-medium text-slate-500">{item.label}</dt>
                    <dd className="mt-1 break-words text-sm font-medium text-slate-900">{item.value ?? "—"}</dd>
                </div>
            ))}
    </dl>
);
