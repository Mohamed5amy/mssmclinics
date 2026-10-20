import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { AlertTriangle, X } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "./Button";

const WIDTHS = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

export const Modal = ({ open, onClose, title, description, footer, size = "md", children }) => (
    <Dialog open={open} onClose={onClose} className="relative z-50">
        <DialogBackdrop transition className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] transition duration-200 data-[closed]:opacity-0" />
        <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 sm:items-center">
                <DialogPanel
                    transition
                    className={clsx(
                        "w-full rounded-2xl bg-white shadow-xl transition duration-200 data-[closed]:translate-y-2 data-[closed]:opacity-0",
                        WIDTHS[size],
                    )}
                >
                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
                        <div>
                            <DialogTitle className="font-semibold text-slate-900">{title}</DialogTitle>
                            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
                        </div>
                        <button type="button" onClick={onClose} className="-m-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="px-5 py-4">{children}</div>
                    {footer && <div className="flex flex-wrap justify-end gap-2 rounded-b-2xl bg-slate-50 px-5 py-3">{footer}</div>}
                </DialogPanel>
            </div>
        </div>
    </Dialog>
);

// "Are you sure?" before deleting, suspending, closing...
export const ConfirmDialog = ({ open, onClose, onConfirm, title, message, confirmLabel = "تأكيد", tone = "danger", loading }) => (
    <Dialog open={open} onClose={onClose} className="relative z-50">
        <DialogBackdrop transition className="fixed inset-0 bg-slate-900/40 transition duration-200 data-[closed]:opacity-0" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
            <DialogPanel transition className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl transition duration-200 data-[closed]:scale-95 data-[closed]:opacity-0">
                <div className={clsx("mb-4 flex h-11 w-11 items-center justify-center rounded-full", tone === "danger" ? "bg-red-50 text-red-600" : "bg-brand-50 text-brand-600")}>
                    <AlertTriangle className="h-5 w-5" />
                </div>
                <DialogTitle className="font-semibold text-slate-900">{title}</DialogTitle>
                {message && <p className="mt-2 text-sm leading-relaxed text-slate-500">{message}</p>}
                <div className="mt-6 flex gap-2">
                    <Button variant={tone === "danger" ? "danger" : "primary"} className="flex-1" onClick={onConfirm} loading={loading}>
                        {confirmLabel}
                    </Button>
                    <Button variant="secondary" className="flex-1" onClick={onClose}>
                        الغاء
                    </Button>
                </div>
            </DialogPanel>
        </div>
    </Dialog>
);
