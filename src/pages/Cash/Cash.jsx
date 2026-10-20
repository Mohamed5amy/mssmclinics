import { useState } from "react";
import { Link } from "react-router-dom";
import { Banknote, CreditCard, Download, Smartphone, Wallet } from "lucide-react";
import { Button, Card, CardHeader, DataTable, Field, Input, PageHeader, Select, StatCard } from "../../ui";
import { useApi } from "../../lib/useApi";
import { downloadCsv } from "../../lib/csv";
import { currentUser } from "../../constants/session";
import { PAYMENT_METHODS, labelOf, money, todayString } from "../../constants/visits";
import { dayTitle } from "../../lib/hours";
import { PAYMENTS, counted } from "../../lib/counted";

const ICONS = { cash: Banknote, instapay: Smartphone, vodafone_cash: Smartphone, card: CreditCard };
const timeOf = (value) => new Date(value).toLocaleTimeString("ar-EG-u-nu-latn", { hour: "numeric", minute: "2-digit" });
const ROLES = { owner: "صاحب المجموعة", receptionist: "استقبال" };

/**
 * The day's cash (الخزنة): every payment taken that day - by when it was paid,
 * so a deposit for next week counts today - per payment method (cash is what
 * the drawer should hold) and per person who took it. The desk sees its own
 * branch; the owner one branch or all.
 */
const Cash = () => {
    const pickBranch = currentUser().role === "owner";
    const [date, setDate] = useState(todayString());
    const [clinicId, setClinicId] = useState("");

    const branches = useApi(pickBranch ? "list-clinic" : null);
    const { data: report, loading } = useApi("cash-report", { date, clinic_id: clinicId });
    const methodAmount = (method) => report?.by_method.find((row) => row.method === method) ?? { amount: 0, count: 0 };

    const exportCsv = () =>
        downloadCsv(`الخزنة-${date}.csv`, [
            { header: "الوقت", value: (row) => timeOf(row.paid_at) },
            { header: "المريض", value: (row) => row.name },
            { header: "الدكتور", value: (row) => row.doctorName },
            { header: "الفرع", value: (row) => row.clinicName },
            { header: "الخدمة", value: (row) => row.serviceName },
            { header: "طريقة الدفع", value: (row) => labelOf(PAYMENT_METHODS, row.method) },
            { header: "المبلغ", value: (row) => row.amount },
            { header: "استلمها", value: (row) => row.recorded_by_name },
        ], report.payments);

    return (
        <>
            <PageHeader
                title="الخزنة"
                subtitle={`الفلوس اللي اتحصّلت ${date === todayString() ? "النهارده" : dayTitle(date)}`}
                actions={report?.payments.length > 0 && <Button variant="secondary" icon={Download} onClick={exportCsv}>تصدير</Button>}
            />

            <Card className="mb-6">
                <div className="flex flex-wrap items-end gap-4 p-5">
                    <Field label="اليوم">
                        <Input type="date" value={date} max={todayString()} onChange={(e) => setDate(e.target.value)} className="w-auto" />
                    </Field>
                    {pickBranch && (
                        <Field label="الفرع">
                            <Select value={clinicId} onChange={(e) => setClinicId(e.target.value)} className="w-auto">
                                <option value="">كل الفروع</option>
                                {branches.data?.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                            </Select>
                        </Field>
                    )}
                </div>
            </Card>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <StatCard label="الإجمالي" value={money(report?.total ?? 0)} icon={Wallet} tone="blue" loading={loading} hint={counted(report?.count ?? 0, PAYMENTS)} />
                {PAYMENT_METHODS.map((method) => (
                    <StatCard
                        key={method.id}
                        label={method.name}
                        value={money(methodAmount(method.id).amount)}
                        icon={ICONS[method.id]}
                        tone={method.id === "cash" ? "green" : "gray"}
                        loading={loading}
                        hint={method.id === "cash" ? "المفروض يكون في الدرج" : counted(methodAmount(method.id).count, PAYMENTS)}
                    />
                ))}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Card>
                    <CardHeader title="حسب اللي استلم" />
                    <DataTable
                        loading={loading}
                        rows={report?.by_staff ?? []}
                        empty="مفيش دفعات"
                        columns={[
                            {
                                key: "name",
                                header: "الاسم",
                                render: (row) => (
                                    <div>
                                        <p className="font-medium text-slate-900">{row.name}</p>
                                        <p className="text-xs text-slate-500">{ROLES[row.role]} · {counted(row.count, PAYMENTS)}</p>
                                    </div>
                                ),
                            },
                            { key: "cash", header: "كاش", render: (row) => money(row.cash) },
                            { key: "amount", header: "الإجمالي", render: (row) => <span className="font-semibold">{money(row.amount)}</span> },
                        ]}
                    />
                </Card>
                <Card className="lg:col-span-2">
                    <CardHeader title="الدفعات" />
                    <DataTable
                        loading={loading}
                        rows={report?.payments ?? []}
                        rowLink={(row) => `/reservations-list/${row.reservation_id}`}
                        empty="مفيش دفعات في اليوم ده"
                        columns={[
                            { key: "paid_at", header: "الوقت", render: (row) => timeOf(row.paid_at) },
                            {
                                key: "name",
                                header: "المريض",
                                render: (row) => (
                                    <div>
                                        <Link to={`/reservations-list/${row.reservation_id}`} className="font-medium text-slate-900">{row.name}</Link>
                                        <p className="text-xs text-slate-500">
                                            {row.doctorName} · {row.serviceName}
                                            {pickBranch && ` · ${row.clinicName}`}
                                            {row.visit_date !== date && ` · كشف ${row.visit_date}`}
                                        </p>
                                    </div>
                                ),
                            },
                            { key: "method", header: "الطريقة", render: (row) => labelOf(PAYMENT_METHODS, row.method) },
                            { key: "amount", header: "المبلغ", render: (row) => <span className="font-semibold">{money(row.amount)}</span> },
                            { key: "recorded_by_name", header: "استلمها" },
                        ]}
                    />
                </Card>
            </div>
        </>
    );
};

export default Cash;
