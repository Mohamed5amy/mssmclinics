import { useMemo, useState } from "react";
import { CalendarDays, CalendarPlus, Download, Search } from "lucide-react";
import { Badge, Button, ButtonLink, Card, DataTable, Input, PageHeader, Select, StatCard } from "../../ui";
import { useApi } from "../../lib/useApi";
import { downloadCsv } from "../../lib/csv";
import { currentUser } from "../../constants/session";
import { STATUS, STATUSES, labelOf, monthRange, money, visitBadge, PAYMENT_METHODS } from "../../constants/visits";
import { matchesPatient } from "../../lib/search";

// Visits over a period, filtered by branch, doctor and status, with the money
// they brought in (for those allowed to see it).
const List = () => {
    const user = currentUser();
    const role = user.role;
    const desk = role === "owner" || role === "receptionist";
    const seesBranches = role === "admin" || role === "owner" || role === "doctor";
    const seesMoney = role !== "receptionist";

    const [range, setRange] = useState(monthRange());
    const [clinicId, setClinicId] = useState("");
    const [doctorId, setDoctorId] = useState("");
    const [status, setStatus] = useState("");
    const [search, setSearch] = useState("");

    const branches = useApi(role === "admin" || role === "owner" ? "list-clinic" : null);
    const doctors = useApi(role !== "doctor" ? "list-doctors" : null, { clinic_id: clinicId });
    const { data, loading } = useApi("list-reservations", { start_date: range.start, end_date: range.end, clinic_id: clinicId, doctor_id: doctorId });

    const rows = useMemo(
        () =>
            [...(data ?? [])]
                .reverse()
                .filter((visit) => (!status || visit.status === status) && matchesPatient({ name: visit.name, phone: "" }, search)),
        [data, status, search],
    );

    const totals = useMemo(() => {
        const counted = rows.filter((visit) => visit.status !== STATUS.CANCELED);
        const collected = counted.reduce((sum, visit) => sum + (visit.paid || 0), 0);
        const shares = counted.reduce((sum, visit) => sum + ((visit.paid || 0) * (visit.doctor?.prectange || 0)) / 100, 0);
        const owed = counted.reduce((sum, visit) => sum + Math.max(visit.remaining || 0, 0), 0);
        return { collected, shares, owed };
    }, [rows]);

    const exportCsv = () =>
        downloadCsv(`visits-${range.start}-${range.end}.csv`, [
            { header: "رقم الكشف", value: (row) => row.id },
            { header: "التاريخ", value: (row) => row.CustomDate },
            { header: "الوقت", value: (row) => row.time },
            { header: "الدور", value: (row) => row.queue_number },
            { header: "الفرع", value: (row) => row.clinicName },
            { header: "الدكتور", value: (row) => row.doctorName },
            { header: "المريض", value: (row) => row.name },
            { header: "الخدمة", value: (row) => row.serviceName },
            { header: "الحالة", value: (row) => visitBadge(row).name },
            { header: "السعر", value: (row) => row.net_price },
            { header: "المدفوع", value: (row) => row.paid },
            { header: "المتبقي", value: (row) => row.remaining },
            { header: "طريقة الدفع", value: (row) => labelOf(PAYMENT_METHODS, row.payment_method) },
        ], rows);

    return (
        <>
            <PageHeader
                title="الكشوفات"
                subtitle={`${rows.length} كشف في الفترة`}
                actions={
                    <>
                        {seesMoney && <Button variant="secondary" icon={Download} onClick={exportCsv} disabled={!rows.length}>تصدير</Button>}
                        {desk && <ButtonLink to="/reservations-list/add" icon={CalendarPlus}>حجز جديد</ButtonLink>}
                    </>
                }
            />

            {seesMoney && (
                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <StatCard label="المحصّل" value={money(totals.collected)} tone="blue" loading={loading} hint="المدفوع فعلياً بدون الملغي" />
                    {role === "doctor" ? (
                        <StatCard label="نسبتي" value={money(totals.shares)} tone="violet" loading={loading} />
                    ) : (
                        <StatCard label="صافي العيادة" value={money(totals.collected - totals.shares)} tone="green" loading={loading} hint={`نسب الدكاترة ${money(totals.shares)}`} />
                    )}
                    <StatCard label="متبقي على المرضى" value={money(totals.owed)} tone="amber" loading={loading} />
                </div>
            )}

            <Card>
                <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
                    <div className="relative w-full sm:w-56">
                        <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-slate-400" />
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="اسم المريض" className="ps-9" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Input type="date" value={range.start} onChange={(e) => setRange({ ...range, start: e.target.value })} className="w-auto" />
                        <span className="text-sm text-slate-400">إلى</span>
                        <Input type="date" value={range.end} onChange={(e) => setRange({ ...range, end: e.target.value })} className="w-auto" />
                    </div>
                    {(branches.data?.length ?? 0) > 1 && (
                        <Select value={clinicId} onChange={(e) => { setClinicId(e.target.value); setDoctorId(""); }} className="w-auto">
                            <option value="">كل الفروع</option>
                            {branches.data.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                        </Select>
                    )}
                    {role !== "doctor" && (
                        <Select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className="w-auto">
                            <option value="">كل الدكاترة</option>
                            {doctors.data?.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}
                        </Select>
                    )}
                    <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto">
                        <option value="">كل الحالات</option>
                        {STATUSES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </Select>
                </div>
                <DataTable
                    loading={loading}
                    rows={rows}
                    rowLink={(row) => `/reservations-list/${row.id}`}
                    emptyIcon={CalendarDays}
                    empty="لا توجد كشوفات"
                    emptyText="غيّر الفترة او الفلاتر"
                    columns={[
                        {
                            key: "date",
                            header: "الموعد",
                            render: (row) => (
                                <div>
                                    <p className="font-medium text-slate-800">{row.CustomDate}</p>
                                    <p className="text-xs text-slate-500">دور {row.queue_number}{row.time && ` · ${row.time}`}</p>
                                </div>
                            ),
                        },
                        {
                            key: "name",
                            header: "المريض",
                            render: (row) => (
                                <div>
                                    <p className="font-medium text-slate-900">{row.name}</p>
                                    <p className="text-xs text-slate-500">{row.serviceName}{row.is_followup && " · إعادة"}</p>
                                </div>
                            ),
                        },
                        ...(role !== "doctor" ? [{ key: "doctorName", header: "الدكتور" }] : []),
                        ...(seesBranches ? [{ key: "clinicName", header: "الفرع" }] : []),
                        { key: "status", header: "الحالة", render: (row) => <Badge tone={visitBadge(row).tone}>{visitBadge(row).name}</Badge> },
                        { key: "paid", header: "المدفوع", render: (row) => money(row.paid) },
                        {
                            key: "remaining",
                            header: "المتبقي",
                            render: (row) => (row.remaining > 0 && row.status !== STATUS.CANCELED ? <span className="font-medium text-amber-700">{money(row.remaining)}</span> : <span className="text-slate-400">—</span>),
                        },
                    ]}
                />
            </Card>
        </>
    );
};

export default List;
