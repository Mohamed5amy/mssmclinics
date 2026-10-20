import { useMemo, useState } from "react";
import { Building2, Plus, Search } from "lucide-react";
import { Badge, ButtonLink, Card, DataTable, Input, PageHeader } from "../../ui";
import { useApi } from "../../lib/useApi";
import { GROUP_STATUS } from "../../constants/statuses";

// Every group on the platform, with its owner and size - the platform owner's home.
const List = () => {
    const { data, loading } = useApi("list-groups");
    const [search, setSearch] = useState("");
    const rows = useMemo(() => (data ?? []).filter((group) => group.name.includes(search.trim())), [data, search]);

    return (
        <>
            <PageHeader
                title="المجموعات"
                subtitle="كل العملاء على المنصة"
                actions={<ButtonLink to="/groups/add" icon={Plus}>مجموعة جديدة</ButtonLink>}
            />
            <Card>
                <div className="border-b border-slate-100 p-4">
                    <div className="relative max-w-xs">
                        <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-slate-400" />
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث باسم المجموعة" className="ps-9" />
                    </div>
                </div>
                <DataTable
                    loading={loading}
                    rows={rows}
                    rowLink={(row) => `/groups/${row.id}`}
                    emptyIcon={Building2}
                    empty="لا توجد مجموعات"
                    columns={[
                        {
                            key: "name",
                            header: "المجموعة",
                            render: (row) => (
                                <div>
                                    <p className="font-medium text-slate-900">{row.name}</p>
                                    <p className="text-xs text-slate-500">{row.ownerName}</p>
                                </div>
                            ),
                        },
                        { key: "ownerEmail", header: "ايميل المالك", render: (row) => <span className="ltr-nums text-slate-500">{row.ownerEmail}</span> },
                        { key: "clinics_count", header: "الفروع" },
                        { key: "doctors_count", header: "الدكاترة" },
                        { key: "receptionists_count", header: "الاستقبال" },
                        { key: "patients_count", header: "المرضى" },
                        {
                            key: "status",
                            header: "الحالة",
                            render: (row) => <Badge tone={GROUP_STATUS[row.status]?.tone} dot>{GROUP_STATUS[row.status]?.name}</Badge>,
                        },
                    ]}
                />
            </Card>
        </>
    );
};

export default List;
