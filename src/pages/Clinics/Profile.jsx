import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MapPin, Pencil, Phone, Trash2 } from "lucide-react";
import { Badge, Button, ButtonLink, Card, ConfirmDialog, DataTable, PageHeader, PageLoader, Tabs, useToast } from "../../ui";
import { errorMessage, post } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { currentUser } from "../../constants/session";
import { QUEUE_STATES, money, monthRange, visitBadge } from "../../constants/visits";
import { BRANCH_STATUS } from "../../constants/statuses";

// What each tab lists about the branch.
const TABS = [
    {
        key: "queue",
        label: "دور اليوم",
        url: "queue",
        link: (row) => `/reservations-list/${row.id}`,
        columns: [
            { key: "queue_number", header: "الدور", render: (row) => <span className="font-bold text-brand-700">{row.queue_number}</span> },
            { key: "name", header: "المريض", render: (row) => <span className="font-medium text-slate-900">{row.name}</span> },
            { key: "doctorName", header: "الدكتور" },
            { key: "serviceName", header: "الخدمة" },
            { key: "queue_state", header: "الحضور", render: (row) => <Badge tone={QUEUE_STATES[row.queue_state]?.tone}>{QUEUE_STATES[row.queue_state]?.name}</Badge> },
        ],
    },
    {
        key: "visits",
        label: "كشوفات الشهر",
        url: "list-reservations",
        params: () => ({ start_date: monthRange().start, end_date: monthRange().end }),
        link: (row) => `/reservations-list/${row.id}`,
        reverse: true,
        columns: [
            { key: "CustomDate", header: "التاريخ" },
            { key: "name", header: "المريض", render: (row) => <span className="font-medium text-slate-900">{row.name}</span> },
            { key: "doctorName", header: "الدكتور" },
            { key: "serviceName", header: "الخدمة" },
            { key: "status", header: "الحالة", render: (row) => <Badge tone={visitBadge(row).tone}>{visitBadge(row).name}</Badge> },
            { key: "paid", header: "المدفوع", render: (row) => money(row.paid) },
        ],
    },
    {
        key: "doctors",
        label: "الدكاترة",
        url: "list-doctors",
        link: (row) => `/doctors-list/${row.id}`,
        columns: [
            { key: "name", header: "الاسم", render: (row) => <span className="font-medium text-slate-900">{row.name}</span> },
            { key: "specializeName", header: "التخصص" },
            { key: "clinicNames", header: "الفروع" },
            { key: "prectange", header: "النسبة", render: (row) => `${row.prectange}%` },
        ],
    },
    {
        key: "receptionists",
        label: "الاستقبال",
        url: "list-receptionists",
        columns: [
            { key: "name", header: "الاسم", render: (row) => <span className="font-medium text-slate-900">{row.name}</span> },
            { key: "email", header: "الايميل", render: (row) => <span className="ltr-nums">{row.email}</span> },
            { key: "phone", header: "الهاتف", render: (row) => <span className="ltr-nums">{row.phone}</span> },
        ],
    },
];

// A branch from above - the platform owner's and the group owner's view: its
// details, and tabs for today's queue, the month's visits, doctors and front desk.
const Profile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const owner = currentUser().role === "owner";

    const { data: branch, loading } = useApi(`show-clinic/${id}`);
    const [tab, setTab] = useState("queue");
    const [confirm, setConfirm] = useState(false);
    const [busy, setBusy] = useState(false);

    const spec = TABS.find((item) => item.key === tab);
    const rows = useApi(spec.url, { clinic_id: id, ...(spec.params?.() ?? {}) });
    const shown = spec.reverse ? [...(rows.data ?? [])].reverse() : rows.data;

    if (loading || !branch) return <PageLoader />;

    const remove = () => {
        setBusy(true);
        post("delete-clinic", { id: +id })
            .then(() => {
                toast.success("تم حذف الفرع");
                navigate("/clinics-list");
            })
            .catch((err) => {
                toast.error(errorMessage(err));
                setConfirm(false);
            })
            .finally(() => setBusy(false));
    };

    return (
        <>
            <PageHeader
                title={branch.name}
                subtitle={branch.groupName}
                back="/clinics-list"
                actions={
                    owner && (
                        <>
                            <ButtonLink to={`/clinics-list/edit/${id}`} variant="secondary" icon={Pencil}>تعديل</ButtonLink>
                            <Button variant="danger-ghost" icon={Trash2} onClick={() => setConfirm(true)}>حذف</Button>
                        </>
                    )
                }
            />

            <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
                <Badge tone={BRANCH_STATUS[branch.status]?.tone} dot>{BRANCH_STATUS[branch.status]?.name}</Badge>
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-400" /> {branch.branch}</span>
                <span className="flex items-center gap-1.5"><Phone className="h-4 w-4 text-slate-400" /> <span className="ltr-nums">{branch.phone}</span></span>
            </div>

            <Card>
                <Tabs
                    className="px-4"
                    value={tab}
                    onChange={setTab}
                    tabs={TABS.map((item) => ({
                        key: item.key,
                        label: item.label,
                        count: item.key === "doctors" ? branch.doctors_count : item.key === "receptionists" ? branch.receptionists_count : undefined,
                    }))}
                />
                <DataTable loading={rows.loading} rows={shown} columns={spec.columns} rowLink={spec.link} empty="لا يوجد بيانات هنا" />
            </Card>

            <ConfirmDialog
                open={confirm}
                onClose={() => setConfirm(false)}
                onConfirm={remove}
                loading={busy}
                title="حذف الفرع؟"
                message="الفرع اللي عنده كشوفات مينفعش يتحذف، تقدر تقفله من التعديل بدل كده."
                confirmLabel="حذف"
            />
        </>
    );
};

export default Profile;
