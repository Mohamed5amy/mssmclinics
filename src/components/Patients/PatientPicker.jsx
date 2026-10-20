import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from "@headlessui/react";
import { ChevronDown, UserPlus } from "lucide-react";
import { clsx } from "clsx";
import { Button, Modal, useToast } from "../../ui";
import { errorMessage, fieldErrors, post } from "../../lib/api";
import { matchesPatient } from "../../lib/search";
import PatientFields from "./PatientFields";

/**
 * Picks the patient for a booking by typing part of the name or phone, or
 * registers a new one on the spot without leaving the booking screen.
 *   patients: the loaded list; onCreated(patient) adds a new one to it
 *   clinicId: the booking's branch, recorded as where a new patient registered
 */
const PatientPicker = ({ patients, value, onChange, onCreated, invalid, clinicId }) => {
    const [query, setQuery] = useState("");
    const [adding, setAdding] = useState(false);

    const selected = patients?.find((patient) => patient.id === value) ?? null;
    const shown = useMemo(() => (patients ?? []).filter((patient) => matchesPatient(patient, query)).slice(0, 30), [patients, query]);

    return (
        <>
            <Combobox value={selected} onChange={(patient) => patient && onChange(patient.id)} onClose={() => setQuery("")}>
                <div className="relative">
                    <ComboboxInput
                        className={clsx(
                            "block h-10 w-full rounded-lg border bg-white pe-9 ps-3 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2",
                            invalid ? "border-red-300 focus:ring-red-500/20" : "border-slate-200 focus:border-brand-500 focus:ring-brand-500/20",
                        )}
                        displayValue={(patient) => (patient ? `${patient.name} · ${patient.phone}` : "")}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="ابحث بالاسم او رقم التليفون"
                    />
                    <ComboboxButton className="absolute inset-y-0 end-0 flex items-center px-2.5 text-slate-400">
                        <ChevronDown className="h-4 w-4" />
                    </ComboboxButton>
                </div>
                <ComboboxOptions
                    anchor="bottom start"
                    className="z-50 mt-1 max-h-72 w-[var(--input-width)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg empty:invisible"
                >
                    {shown.map((patient) => (
                        <ComboboxOption key={patient.id} value={patient} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm data-[focus]:bg-brand-50">
                            <span className="truncate font-medium text-slate-800">{patient.name}</span>
                            <span className="ltr-nums text-xs text-slate-500">{patient.phone}</span>
                        </ComboboxOption>
                    ))}
                    {query && shown.length === 0 && <p className="px-3 py-2 text-sm text-slate-500">مفيش مريض بالاسم او الرقم ده</p>}
                </ComboboxOptions>
            </Combobox>
            <button type="button" onClick={() => setAdding(true)} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800">
                <UserPlus className="h-4 w-4" /> مريض جديد
            </button>

            {adding && (
                <QuickAddPatient
                    initialQuery={query}
                    clinicId={clinicId}
                    onClose={() => setAdding(false)}
                    onCreated={(patient) => {
                        onCreated(patient);
                        onChange(patient.id);
                        setAdding(false);
                    }}
                />
            )}
        </>
    );
};

// Registers a patient from the booking screen; what was typed in the search
// fills the name or the phone.
const QuickAddPatient = ({ initialQuery, clinicId, onClose, onCreated }) => {
    const toast = useToast();
    const typedPhone = /^[\d+\s]+$/.test(initialQuery.trim());
    const form = useForm({ defaultValues: { name: typedPhone ? "" : initialQuery, phone: typedPhone ? initialQuery.trim() : "" } });
    const [serverErrors, setServerErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const save = form.handleSubmit((data) => {
        setSaving(true);
        post("clinic/add-patients", { ...data, age: +data.age, provider_id: +data.provider_id, ...(clinicId ? { clinic_id: +clinicId } : {}) })
            .then((patient) => {
                toast.success(`تم تسجيل ${patient.name}`);
                onCreated(patient);
            })
            .catch((err) => {
                setServerErrors(fieldErrors(err));
                toast.error(errorMessage(err));
            })
            .finally(() => setSaving(false));
    });

    return (
        <Modal
            open
            onClose={onClose}
            size="lg"
            title="تسجيل مريض جديد"
            description="بيتسجل في ملف المجموعة ويتختار للحجز على طول"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>الغاء</Button>
                    <Button onClick={save} loading={saving}>تسجيل واختيار</Button>
                </>
            }
        >
            <PatientFields form={form} serverErrors={serverErrors} compact />
        </Modal>
    );
};

export default PatientPicker;
