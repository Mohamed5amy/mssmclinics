import { useState } from "react";
import { Hospital, MapPin, Phone, Plus, Stethoscope, Headset } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge, ButtonLink, EmptyState, PageHeader, PageLoader, Select } from "../../ui";
import { useApi } from "../../lib/useApi";
import { currentUser } from "../../constants/session";
import { BRANCH_STATUS } from "../../constants/statuses";

// Branches as cards: the group owner's, or every group's for the platform owner.
const List = () => {
    const user = currentUser();
    const platform = user.role === "admin";
    const [groupId, setGroupId] = useState("");

    const groups = useApi(platform ? "list-groups" : null);
    const { data, loading } = useApi("list-clinic", { group_id: groupId });

    return (
        <>
            <PageHeader
                title="الفروع"
                subtitle={platform ? "فروع كل المجموعات" : user.groupName}
                actions={
                    <>
                        {platform && (
                            <Select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="w-auto min-w-44">
                                <option value="">كل المجموعات</option>
                                {groups.data?.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                            </Select>
                        )}
                        {user.role === "owner" && <ButtonLink to="/clinics-list/add" icon={Plus}>فرع جديد</ButtonLink>}
                    </>
                }
            />

            {loading ? (
                <PageLoader />
            ) : !data?.length ? (
                <EmptyState
                    icon={Hospital}
                    title="لسه مفيش فروع"
                    text="ضيف أول فرع، وبعدين ضيف الدكاترة والاستقبال بتوعه."
                    action={user.role === "owner" && <ButtonLink to="/clinics-list/add" icon={Plus}>فرع جديد</ButtonLink>}
                />
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {data.map((branch) => (
                        <Link
                            key={branch.id}
                            to={`/clinics-list/${branch.id}`}
                            className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                                        <Hospital className="h-5 w-5" />
                                    </span>
                                    <div>
                                        <p className="font-semibold text-slate-900 group-hover:text-brand-700">{branch.name}</p>
                                        {platform && <p className="text-xs text-slate-500">{branch.groupName}</p>}
                                    </div>
                                </div>
                                <Badge tone={BRANCH_STATUS[branch.status]?.tone}>{BRANCH_STATUS[branch.status]?.name}</Badge>
                            </div>
                            <div className="mt-4 space-y-1.5 text-sm text-slate-500">
                                <p className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0" /> <span className="truncate">{branch.branch}</span></p>
                                <p className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0" /> <span className="ltr-nums">{branch.phone}</span></p>
                            </div>
                            <div className="mt-4 flex gap-4 border-t border-slate-100 pt-4 text-sm">
                                <span className="flex items-center gap-1.5 text-slate-600"><Stethoscope className="h-4 w-4 text-slate-400" /> {branch.doctors_count} دكاترة</span>
                                <span className="flex items-center gap-1.5 text-slate-600"><Headset className="h-4 w-4 text-slate-400" /> {branch.receptionists_count} استقبال</span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </>
    );
};

export default List;
