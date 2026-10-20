import { useMemo, useState } from "react";
import { Plus, Search, Stethoscope } from "lucide-react";
import { Badge, ButtonLink, Card, DataTable, Input, PageHeader, Select } from "../../ui";
import { useApi } from "../../lib/useApi";
import { currentUser } from "../../constants/session";

// The group's doctors (every group's for the platform), with the branches they work at.
const List = () => {
    const user = currentUser();
    const platform = user.role === "admin";
    const [clinicId, setClinicId] = useState("");
    const [search, setSearch] = useState("");

    const branches = useApi("list-clinic");
    const { data, loading } = useApi("list-doctors", { clinic_id: clinicId });
    const rows = useMemo(() => (data ?? []).filter((doctor) => doctor.name.includes(search.trim())), [data, search]);

    return (
        <>
            <PageHeader
                title="الدكاترة"
                subtitle={platform ? "دكاترة كل المجموعات" : `${data?.length ?? 0} دكتور`}
                actions={user.role === "owner" && <ButtonLink to="/doctors-list/add" icon={Plus}>دكتور جديد</ButtonLink>}
            />
            <Card>
                <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
                    <div className="relative w-full max-w-xs">
                        <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-slate-400" />
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم" className="ps-9" />
                    </div>
                    <Select value={clinicId} onChange={(e) => setClinicId(e.target.value)} className="w-auto min-w-44">
                        <option value="">كل الفروع</option>
                        {branches.data?.map((branch) => (
                            <option key={branch.id} value={branch.id}>{branch.name}{platform ? ` · ${branch.groupName}` : ""}</option>
                        ))}
                    </Select>
                </div>
                <DataTable
                    loading={loading}
                    rows={rows}
                    rowLink={(row) => `/doctors-list/${row.id}`}
                    emptyIcon={Stethoscope}
                    empty="لا يوجد دكاترة"
                    columns={[
                        {
                            key: "name",
                            header: "الدكتور",
                            render: (row) => (
                                <div>
                                    <p className="font-medium text-slate-900">{row.name}</p>
                                    <p className="text-xs text-slate-500">{row.specializeName}</p>
                                </div>
                            ),
                        },
                        {
                            key: "branches",
                            header: "الفروع",
                            render: (row) => (
                                <div className="flex flex-wrap gap-1">
                                    {row.clinicNames.split("، ").filter(Boolean).map((name) => <Badge key={name} tone="blue">{name}</Badge>)}
                                </div>
                            ),
                        },
                        { key: "phone", header: "الهاتف", render: (row) => <span className="ltr-nums">{row.phone}</span> },
                        { key: "prectange", header: "النسبة", render: (row) => `${row.prectange}%` },
                        ...(platform ? [{ key: "groupName", header: "المجموعة" }] : []),
                    ]}
                />
            </Card>
        </>
    );
};

export default List;
