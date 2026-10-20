import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BellRing } from "lucide-react";
import { Badge, Card, EmptyState, Field, Input, PageHeader, PageLoader, Select } from "../../ui";
import { post } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { currentUser } from "../../constants/session";
import { STATUS, dayString } from "../../constants/visits";
import { dayTitle, formatTime } from "../../lib/hours";
import { reminderText } from "../../lib/whatsapp";
import { BOOKINGS, counted } from "../../lib/counted";
import WhatsAppButton from "../../components/WhatsApp/WhatsAppButton";

const tomorrow = () => {
    const now = new Date();
    return dayString(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
};

const sentAt = (value) => new Date(value).toLocaleTimeString("ar-EG-u-nu-latn", { hour: "numeric", minute: "2-digit" });

/**
 * A day's bookings (tomorrow by default), each with a WhatsApp reminder. The
 * ones already sent are marked, so nobody is messaged twice and the desk sees
 * who is left.
 */
const Reminders = () => {
    const pickBranch = currentUser().role === "owner";
    const [date, setDate] = useState(tomorrow());
    const [clinicId, setClinicId] = useState("");
    const [doctorId, setDoctorId] = useState("");

    const branches = useApi(pickBranch ? "list-clinic" : null);
    const doctors = useApi("list-doctors", { clinic_id: clinicId });
    const { data, loading, setData } = useApi("list-reservations", { start_date: date, end_date: date, clinic_id: clinicId, doctor_id: doctorId });

    const rows = useMemo(
        () =>
            (data ?? [])
                .filter((visit) => visit.status === STATUS.PENDING)
                .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99") || a.id - b.id),
        [data],
    );
    const sent = rows.filter((visit) => visit.reminded_at).length;

    const markSent = (visit) =>
        post("mark-reminded", { id: visit.id })
            .then((updated) => setData((list) => list.map((row) => (row.id === updated.id ? updated : row))))
            .catch(() => {});

    return (
        <>
            <PageHeader title="التذكيرات" subtitle="ابعت لكل مريض تذكير بميعاده على واتساب، واللي اتبعتله بيتعلّم عشان ميتبعتلوش تاني." />

            <Card className="mb-6">
                <div className="flex flex-wrap items-end gap-4 p-5">
                    <Field label="اليوم">
                        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
                    </Field>
                    {pickBranch && (
                        <Field label="الفرع">
                            <Select value={clinicId} onChange={(e) => { setClinicId(e.target.value); setDoctorId(""); }} className="w-auto">
                                <option value="">كل الفروع</option>
                                {branches.data?.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                            </Select>
                        </Field>
                    )}
                    <Field label="الدكتور">
                        <Select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className="w-auto">
                            <option value="">كل الدكاترة</option>
                            {doctors.data?.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}
                        </Select>
                    </Field>
                    {rows.length > 0 && (
                        <div className="flex h-10 items-center gap-2 text-sm">
                            <Badge>{counted(rows.length, BOOKINGS)}</Badge>
                            <Badge tone="green">{sent} اتبعتلهم</Badge>
                            {rows.length > sent && <Badge tone="amber">{rows.length - sent} لسه</Badge>}
                        </div>
                    )}
                </div>
            </Card>

            <Card>
                {loading && !data ? (
                    <PageLoader />
                ) : rows.length ? (
                    <ul className="divide-y divide-slate-100">
                        {rows.map((visit) => (
                            <li key={visit.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                                <span className="w-16 shrink-0 text-sm font-semibold text-brand-700">{visit.time ? formatTime(visit.time) : "—"}</span>
                                <div className="min-w-0 flex-1">
                                    <Link to={`/reservations-list/${visit.id}`} className="font-medium text-slate-900 hover:text-brand-700">{visit.name}</Link>
                                    <p className="truncate text-xs text-slate-500">
                                        <span className="ltr-nums">{visit.patientPhone}</span> · {visit.doctorName}{pickBranch && ` · ${visit.clinicName}`}
                                    </p>
                                </div>
                                {visit.reminded_at && <Badge tone="green" dot>اتبعت {sentAt(visit.reminded_at)}</Badge>}
                                <WhatsAppButton phone={visit.patientPhone} text={reminderText(visit)} onSent={() => markSent(visit)} size="sm">
                                    {visit.reminded_at ? "ابعت تاني" : "ابعت تذكير"}
                                </WhatsAppButton>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <EmptyState icon={BellRing} title={`مفيش حجوزات ${dayTitle(date)}`} text="غيّر اليوم او الفلاتر" />
                )}
            </Card>
        </>
    );
};

export default Reminders;
