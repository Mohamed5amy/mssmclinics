import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { clsx } from "clsx";

const ToastContext = createContext(null);

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };
const TONES = {
    success: "text-emerald-600",
    error: "text-red-600",
    info: "text-brand-600",
};

// Short confirmations at the bottom of the screen: toast.success("تم الحفظ")
export const ToastProvider = ({ children }) => {
    const [items, setItems] = useState([]);

    const push = useCallback((tone, text) => {
        const id = Math.random().toString(36).slice(2);
        setItems((list) => [...list, { id, tone, text }]);
        setTimeout(() => setItems((list) => list.filter((item) => item.id !== id)), 3500);
    }, []);

    const toast = useMemo(
        () => ({
            success: (text) => push("success", text),
            error: (text) => push("error", text),
            info: (text) => push("info", text),
        }),
        [push],
    );

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
                {items.map((item) => {
                    const Icon = ICONS[item.tone];
                    return (
                        <div
                            key={item.id}
                            className="pointer-events-auto flex max-w-md items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-lg ring-1 ring-slate-200"
                        >
                            <Icon className={clsx("h-5 w-5 shrink-0", TONES[item.tone])} />
                            {item.text}
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => useContext(ToastContext);
