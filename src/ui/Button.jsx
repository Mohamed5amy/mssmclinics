import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { clsx } from "clsx";

const VARIANTS = {
    primary: "bg-brand-600 text-white shadow-sm hover:bg-brand-700",
    secondary: "border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    soft: "bg-brand-50 text-brand-700 hover:bg-brand-100",
    danger: "bg-red-600 text-white shadow-sm hover:bg-red-700",
    "danger-ghost": "text-red-600 hover:bg-red-50",
    success: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
};

const SIZES = {
    sm: "h-8 gap-1.5 px-3 text-sm",
    md: "h-10 gap-2 px-4 text-sm",
    lg: "h-12 gap-2 px-6 text-base",
    icon: "h-9 w-9",
};

// The classes behind every button, for links styled as buttons.
export const buttonClass = (variant = "primary", size = "md", className) =>
    clsx(
        "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-lg font-medium transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
    );

export const Button = forwardRef(function Button(
    { variant = "primary", size = "md", loading = false, icon: Icon, className, children, type = "button", disabled, ...props },
    ref,
) {
    return (
        <button ref={ref} type={type} disabled={disabled || loading} className={buttonClass(variant, size, className)} {...props}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon && <Icon className="h-4 w-4" />}
            {children}
        </button>
    );
});

export const ButtonLink = ({ to, variant = "primary", size = "md", icon: Icon, className, children, ...props }) => (
    <Link to={to} className={buttonClass(variant, size, className)} {...props}>
        {Icon && <Icon className="h-4 w-4" />}
        {children}
    </Link>
);
