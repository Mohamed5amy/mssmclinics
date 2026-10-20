import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowDownToLine, Download, HandCoins, Plus, Scale, Trash2, Wallet } from "lucide-react";
import { Badge, Button, Card, CardHeader, ConfirmDialog, DataTable, Field, Input, Modal, PageHeader, PageLoader, Segmented, Select, StatCard, useToast } from "../../ui";
import { errorMessage, post } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { downloadCsv } from "../../lib/csv";
import { currentUser } from "../../constants/session";
import { dayString, money, monthRange, todayString, visitBadge } from "../../constants/visits";

const PERIODS = [
    { id: "month", name: "هذا الشهر" },
    { id: "last", name: "الشهر الماضي" },
    { id: "custom", name: "فترة مخصصة" },
];

const periodRange = (period, custom) => {
    const now = new Date();
    if (period === "last") return monthRange(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    if (period === "custom") return custom;
    return monthRange(now);
};

/**
 * A doctor's statement (كشف حساب): what they were owed coming into the period,
 * their share of what was collected on their visits, what they were paid, and
 * what they are owed now. The owner records payouts; a doctor sees their own.
 */
const Statement = () => {
    const user = currentUser();
    const isDoctor = user.role === "doctor";
    const owner = user.role === "owner";
    const toast = useToast();
    const [params, setParams] = useSearchParams();

    const [period, setPeriod] = useState("month");
    const [custom, setCustom] = useState(monthRange());
    const range = periodRange(period, custom);

    const doctors = useApi(isDoctor ? null : "list-doctors");
    const doctorId = isDoctor ? user.id : +params.get("doctor_id") || doctors.data?.[0]?.id;
    const { data, loading, reload } = useApi(doctorId ? "doctor-statement" : null, { doctor_id: doctorId, start: range.start, end: range.end });

    const [paying, setPaying] = useState(false);
    const [removing, setRemoving] = useState(null);
    const [busy, setBusy] = useState(false);

    if (!data && (loading || doctors.loading)) return <PageLoader />;

    const removePayout = () => {
        setBusy(true);
        post("delete-doctor-payout", { id: removing.id })
            .then(() => {
                toast.success("تم حذف المبلغ");
                setRemoving(null);
                reload(true);
            })
            .catch((err) => toast.error(errorMessage(err)))
            .finally(() => setBusy(false));
    };

    const exportCsv = () =>
        downloadCsv(`كشف-حساب-${data.doctor.name}-${data.start}-${data.end}.csv`, [
            { header: "التاريخ", value: (row) => row.CustomDate },
            { header: "المريض", value: (row) => row.name },
            { header: "الفرع", value: (row) => row.clinicName },
            { header: "الخدمة", value: (row) => row.serviceName },
            { header: "المدفوع", value: (row) => row.paid },
            { header: "النسبة %", value: (row) => row.prectange },
            { header: "نصيب الدكتور", value: (row) => row.share },
        ], data.visits);

    const owed = data?.closing ?? 0;

    return (
        <>
            <PageHeader
                title={isDoctor ? "حسابي" : "حسابات الدكاترة"}
                subtitle={data ? `${data.doctor.name} · ${data.doctor.specializeName} · نسبته ${data.doctor.prectange}%` : undefined}
                actions={data?.visits.length > 0 && <Button variant="secondary" icon={Download} onClick={exportCsv}>تصدير</Button>}
            />

            <Card className="mb-6">
                <div className="flex flex-wrap items-end gap-4 p-5">
                    {!isDoctor && (
                        <Field label="الدكتور">
                            <Select value={doctorId ?? ""} onChange={(e) => setParams({ doctor_id: e.target.value }, { replace: true })} className="w-auto min-w-[14rem]">
                                {doctors.data?.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}
                            </Select>
                        </Field>
                    )}
                    <div>
                        <p className="mb-1.5 text-sm font-medium text-slate-700">الفترة</p>
                        <Segmented options={PERIODS} value={period} onChange={setPeriod} />
                    </div>
                    {period === "custom" && (
                        <>
                            <Field label="من">
                                <Input type="date" value={custom.start} onChange={(e) => setCustom({ ...custom, start: e.target.value })} className="w-auto" />
                            </Field>
                            <Field label="إلى">
                                <Input type="date" value={custom.end} onChange={(e) => setCustom({ ...custom, end: e.target.value })} className="w-auto" />
                            </Field>
                        </>
                    )}
                </div>
            </Card>

            {data && (
                <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            label="رصيد أول المدة"
                            value={money(Math.abs(data.opening))}
                            icon={Scale}
                            tone="gray"
                            loading={loading}
                            hint={data.opening < 0 ? `سلفة عليه قبل ${data.start}` : `المستحق له قبل ${data.start}`}
                        />
                        <StatCard label="نسبته في الفترة" value={money(data.share)} icon={HandCoins} tone="violet" loading={loading} hint={`من ${money(data.collected)} اتحصّل`} />
                        <StatCard label="اتصرف له" value={money(data.paid_out)} icon={ArrowDownToLine} tone="blue" loading={loading} />
                        <StatCard
                            label={owed < 0 ? "عليه سلفة" : "المستحق له"}
                            value={money(Math.abs(owed))}
                            icon={Wallet}
                            tone={owed < 0 ? "amber" : "green"}
                            loading={loading}
                            hint={`لحد ${data.end}`}
                        />
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <Card>
                            <CardHeader
                                title="اللي اتصرف له"
                                actions={owner && <Button size="sm" variant="soft" icon={Plus} onClick={() => setPaying(true)}>صرف مبلغ</Button>}
                            />
                            {data.payouts.length ? (
                                <ul className="divide-y divide-slate-100">
                                    {data.payouts.map((payout) => (
                                        <li key={payout.id} className="flex items-center gap-3 px-5 py-3">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-slate-900">{money(payout.amount)}</p>
                                                <p className="truncate text-xs text-slate-500">{payout.date}{payout.note && ` · ${payout.note}`}</p>
                                            </div>
                                            {owner && (
                                                <button type="button" onClick={() => setRemoving(payout)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="حذف">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="px-5 py-6 text-center text-sm text-slate-500">مفيش مبالغ اتصرفت في الفترة دي</p>
                            )}
                        </Card>

                        <Card className="lg:col-span-2">
                            <CardHeader title="الكشوفات" description="المدفوع على كل كشف ونسبة الدكتور منه" />
                            <DataTable
                                loading={loading}
                                rows={data.visits}
                                rowLink={(row) => `/reservations-list/${row.id}`}
                                empty="مفيش كشوفات في الفترة دي"
                                columns={[
                                    { key: "CustomDate", header: "التاريخ" },
                                    {
                                        key: "name",
                                        header: "المريض",
                                        render: (row) => (
                                            <div>
                                                <Link to={`/reservations-list/${row.id}`} className="font-medium text-slate-900">{row.name}</Link>
                                                <p className="text-xs text-slate-500">{row.serviceName} · {row.clinicName}</p>
                                            </div>
                                        ),
                                    },
                                    { key: "status", header: "الحالة", render: (row) => <Badge tone={visitBadge(row).tone}>{visitBadge(row).name}</Badge> },
                                    { key: "paid", header: "المدفوع", render: (row) => money(row.paid) },
                                    { key: "share", header: "نصيبه", render: (row) => <span className="font-semibold">{money(row.share)}</span> },
                                ]}
                            />
                        </Card>
                    </div>
                </>
            )}

            {paying && data && (
                <PayoutModal
                    doctor={data.doctor}
                    owed={owed}
                    onClose={() => setPaying(false)}
                    onSaved={() => {
                        setPaying(false);
                        reload(true);
                    }}
                />
            )}
            <ConfirmDialog
                open={!!removing}
                onClose={() => setRemoving(null)}
                onConfirm={removePayout}
                loading={busy}
                title={`حذف ${removing ? money(removing.amount) : ""}؟`}
                message="استخدمه لتصحيح مبلغ اتسجل غلط."
                confirmLabel="حذف"
            />
        </>
    );
};

// The owner records money paid to the doctor; it can be more than is owed (an advance).
const PayoutModal = ({ doctor, owed, onClose, onSaved }) => {
    const toast = useToast();
    const [amount, setAmount] = useState(owed > 0 ? String(owed) : "");
    const [date, setDate] = useState(todayString());
    const [note, setNote] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const save = () => {
        if (!(+amount > 0)) return setError("ادخل مبلغ صحيح");
        setSaving(true);
        post("doctor-payout", { doctor_id: doctor.id, amount: +amount, date, note })
            .then(() => {
                toast.success(`تم صرف ${money(amount)} لـ ${doctor.name}`);
                onSaved();
            })
            .catch((err) => setError(errorMessage(err)))
            .finally(() => setSaving(false));
    };

    return (
        <Modal
            open
            onClose={onClose}
            size="sm"
            title={`صرف مبلغ لـ ${doctor.name}`}
            description={owed > 0 ? `المستحق له ${money(owed)}` : "مفيش مستحقات، المبلغ هيتسجل سلفة"}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>الغاء</Button>
                    <Button onClick={save} loading={saving}>تسجيل</Button>
                </>
            }
        >
            <div className="space-y-4">
                <Field label="المبلغ (جنيه)" error={error}>
                    <Input type="number" min={0} value={amount} onChange={(e) => { setAmount(e.target.value); setError(""); }} invalid={!!error} autoFocus />
                </Field>
                <Field label="اليوم">
                    <Input type="date" value={date} max={dayString()} onChange={(e) => setDate(e.target.value)} />
                </Field>
                <Field label="ملاحظة" hint="اختياري، مثلاً: مستحقات شهر أكتوبر">
                    <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
                </Field>
            </div>
        </Modal>
    );
};

export default Statement;
