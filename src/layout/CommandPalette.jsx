import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions, Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { ArrowLeft, CalendarPlus, Search, UserRound } from "lucide-react";
import { clsx } from "clsx";
import { get } from "../lib/api";
import { matchesPatient } from "../lib/search";
import { currentUser } from "../constants/session";
import { navFor } from "./nav";

/**
 * Ctrl+K from anywhere: find a patient by name or phone and open the file (or
 * book for them straight away), or jump to a page.
 */
export const CommandPalette = ({ open, onClose }) => {
    const navigate = useNavigate();
    const user = currentUser();
    const canBook = user.role === "owner" || user.role === "receptionist";
    const searchesPatients = ["admin", "owner", "receptionist"].includes(user.role);

    const [query, setQuery] = useState("");
    const [patients, setPatients] = useState(null);

    // Loaded fresh each time the search opens, so new patients show up
    useEffect(() => {
        if (!open) return;
        setQuery("");
        if (searchesPatients) {
            get("list-patients").then(setPatients).catch(() => setPatients([]));
        }
    }, [open, searchesPatients]);

    const pages = useMemo(() => navFor(user.role).flatMap((group) => group.items), [user.role]);

    const results = useMemo(() => {
        const found = (patients ?? []).filter((patient) => matchesPatient(patient, query)).slice(0, 7);
        const pageHits = query.trim() ? pages.filter((page) => page.label.includes(query.trim())) : pages.slice(0, 4);
        return [
            ...found.map((patient) => ({ type: "patient", key: "p" + patient.id, patient })),
            ...pageHits.map((page) => ({ type: "page", key: page.to, page })),
        ];
    }, [patients, query, pages]);

    const go = (item) => {
        if (!item) return;
        onClose();
        navigate(item.type === "patient" ? `/patients-list/${item.patient.id}` : item.page.to);
    };

    return (
        <Dialog open={open} onClose={onClose} className="relative z-50">
            <DialogBackdrop transition className="fixed inset-0 bg-slate-900/40 transition duration-150 data-[closed]:opacity-0" />
            <div className="fixed inset-0 overflow-y-auto p-4 pt-[12vh]">
                <DialogPanel transition className="mx-auto max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 transition duration-150 data-[closed]:scale-95 data-[closed]:opacity-0">
                    <Combobox onChange={go}>
                        <div className="flex items-center gap-3 border-b border-slate-100 px-4">
                            <Search className="h-5 w-5 text-slate-400" />
                            <ComboboxInput
                                autoFocus
                                className="h-14 w-full border-0 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
                                placeholder={searchesPatients ? "اسم المريض او رقم التليفون..." : "اكتب اسم الصفحة..."}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                        </div>

                        <ComboboxOptions static className="max-h-96 overflow-y-auto p-2">
                            {searchesPatients && patients === null && <p className="px-3 py-6 text-center text-sm text-slate-400">جاري التحميل...</p>}
                            {results.length === 0 && patients !== null && (
                                <p className="px-3 py-6 text-center text-sm text-slate-500">لا توجد نتائج لـ &quot;{query}&quot;</p>
                            )}
                            {results.map((item) => (
                                <ComboboxOption
                                    key={item.key}
                                    value={item}
                                    className="group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 data-[focus]:bg-brand-50"
                                >
                                    {item.type === "patient" ? (
                                        <>
                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 group-data-[focus]:bg-white group-data-[focus]:text-brand-600">
                                                <UserRound className="h-4 w-4" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-medium text-slate-900">{item.patient.name}</span>
                                                <span className="ltr-nums block text-xs text-slate-500">{item.patient.phone}</span>
                                            </span>
                                            {canBook && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onClose();
                                                        navigate(`/reservations-list/add?patient_id=${item.patient.id}`);
                                                    }}
                                                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
                                                >
                                                    <CalendarPlus className="h-3.5 w-3.5" /> حجز
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 group-data-[focus]:bg-white group-data-[focus]:text-brand-600">
                                                <item.page.icon className="h-4 w-4" />
                                            </span>
                                            <span className="flex-1 text-sm text-slate-700">{item.page.label}</span>
                                            <ArrowLeft className={clsx("h-4 w-4 text-slate-300 group-data-[focus]:text-brand-500")} />
                                        </>
                                    )}
                                </ComboboxOption>
                            ))}
                        </ComboboxOptions>
                    </Combobox>
                    <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-400">
                        <span>↑ ↓ للتنقل · Enter للفتح</span>
                        <span>Esc للإغلاق</span>
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    );
};
