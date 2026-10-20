import { useState } from "react";
import { Link } from "react-router-dom";
import { History } from "lucide-react";
import { Badge, Button, Card, CardHeader } from "../../ui";
import { visitBadge } from "../../constants/visits";
import { dayTitle, formatTime } from "../../lib/hours";
import { VISITS, counted } from "../../lib/counted";

const SHOWN = 5;

/**
 * The patient's other visits with any of the group's doctors, newest first,
 * with each diagnosis - what the doctor reads before writing their own.
 */
const VisitHistory = ({ visits, currentId }) => {
    const [all, setAll] = useState(false);
    const others = visits.filter((visit) => visit.id !== currentId);
    const shown = all ? others : others.slice(0, SHOWN);

    return (
        <Card>
            <CardHeader title="الزيارات السابقة" description={others.length ? `${counted(others.length, VISITS)} في كل الفروع ومع كل الدكاترة` : undefined} />
            {others.length ? (
                <>
                    <ul className="divide-y divide-slate-100">
                        {shown.map((visit) => {
                            const badge = visitBadge(visit);
                            return (
                                <li key={visit.id}>
                                    <Link to={`/reservations-list/${visit.id}`} className="block px-5 py-3 transition hover:bg-slate-50">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <p className="text-sm font-medium text-slate-900">
                                                {dayTitle(visit.CustomDate)} {visit.CustomDate.slice(0, 4)}
                                                {visit.time && <span className="font-normal text-slate-500"> · {formatTime(visit.time)}</span>}
                                            </p>
                                            <div className="flex gap-1.5">
                                                {visit.is_followup && <Badge tone="violet">إعادة</Badge>}
                                                <Badge tone={badge.tone}>{badge.name}</Badge>
                                            </div>
                                        </div>
                                        <p className="mt-0.5 text-xs text-slate-500">{visit.doctorName} · {visit.clinicName} · {visit.serviceName}</p>
                                        {visit.Diagnosis && <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-sm text-slate-700">{visit.Diagnosis}</p>}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                    {others.length > SHOWN && (
                        <div className="border-t border-slate-100 px-5 py-3">
                            <Button variant="ghost" size="sm" onClick={() => setAll(!all)}>{all ? "أقل" : `عرض الكل (${others.length})`}</Button>
                        </div>
                    )}
                </>
            ) : (
                <p className="flex items-center gap-2 px-5 py-6 text-sm text-slate-500"><History className="h-4 w-4" /> دي أول زيارة للمريض</p>
            )}
        </Card>
    );
};

export default VisitHistory;
