import { useMemo, useState } from "react";
import { Search, UserPlus, Users } from "lucide-react";
import { ButtonLink, Card, DataTable, Input, PageHeader, Select } from "../../ui";
import { useApi } from "../../lib/useApi";
import { currentUser } from "../../constants/session";
import { matchesPatient } from "../../lib/search";

// The group's patient files (one per patient, shared by every branch).
const List = () => {
    const user = currentUser();
    const platform = user.role === "admin";
    const desk = user.role === "owner" || user.role === "receptionist";
    const [groupId, setGroupId] = useState("");
    const [search, setSearch] = useState("");

    const groups = useApi(platform ? "list-groups" : null);
    const { data, loading } = useApi("list-patients", { group_id: groupId });
    const rows = useMemo(() => [...(data ?? [])].reverse().filter((patient) => matchesPatient(patient, search)), [data, search]);

    return (
        <>
            <PageHeader
                title="المرضى"
                subtitle={`${data?.length ?? 0} ملف${platform ? "" : " · مشتركين بين كل الفروع"}`}
                actions={desk && <ButtonLink to="/patients-list/add" icon={UserPlus}>مريض جديد</ButtonLink>}
            />
            <Card>
                <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
                    <div className="relative w-full max-w-sm">
                        <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-slate-400" />
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم او رقم التليفون" className="ps-9" />
                    </div>
                    {platform && (
                        <Select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="w-auto min-w-44">
                            <option value="">كل المجموعات</option>
                            {groups.data?.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                        </Select>
                    )}
                </div>
                <DataTable
                    loading={loading}
                    rows={rows}
                    rowLink={(row) => `/patients-list/${row.id}`}
                    emptyIcon={Users}
                    empty={search ? "مفيش مريض بالاسم او الرقم ده" : "لسه مفيش مرضى"}
                    columns={[
                        {
                            key: "name",
                            header: "المريض",
                            render: (row) => (
                                <div>
                                    <p className="font-medium text-slate-900">{row.name}</p>
                                    <p className="text-xs text-slate-500">{row.sex} · {row.age} سنة</p>
                                </div>
                            ),
                        },
                        { key: "phone", header: "التليفون", render: (row) => <span className="ltr-nums">{row.phone}</span> },
                        { key: "clinicName", header: "اتسجل في", render: (row) => row.clinicName || "—" },
                        { key: "providerName", header: "عرفنا عن طريق" },
                        ...(platform ? [{ key: "groupName", header: "المجموعة" }] : []),
                    ]}
                />
            </Card>
        </>
    );
};

export default List;
