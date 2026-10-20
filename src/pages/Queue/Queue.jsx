import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarPlus, FileText, ListOrdered, RefreshCw, SkipForward, UserCheck, UserX } from "lucide-react";
import { clsx } from "clsx";
import { Badge, Button, ButtonLink, Card, EmptyState, Input, PageHeader, PageLoader, Select, useToast } from "../../ui";
import { errorMessage, post } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { currentUser } from "../../constants/session";
import { BOOKING_TYPES, QUEUE_STATES, STATUS, labelOf, longDate, money, todayString } from "../../constants/visits";

// The day's queue (الدور), one card per branch and doctor: who is in with the
// doctor, who is waiting, and who booked but hasn't arrived. The desk checks
// patients in; the doctor (or the desk for them) calls the next patient.
const Queue = () => {
    const user = currentUser();
    const desk = user.role === "owner" || user.role === "receptionist";
    const seesBranches = user.role === "owner" || user.role === "admin";
    const toast = useToast();

    const [date, setDate] = useState(todayString());
    const [clinicId, setClinicId] = useState("");
    const [doctorId, setDoctorId] = useState("");
    const isToday = date === todayString();

    const branches = useApi(seesBranches ? "list-clinic" : null);
    const doctors = useApi(user.role !== "doctor" ? "list-doctors" : null, { clinic_id: clinicId });
    const { data, loading, reload } = useApi("queue", { date, clinic_id: clinicId, doctor_id: doctorId });

    // Keep today's queue fresh while the screen is open
    useEffect(() => {
        if (!isToday) return;
        const timer = setInterval(() => reload(true), 30000);
        return () => clearInterval(timer);
    }, [isToday, reload]);

    const queues = useMemo(() => {
        const map = new Map();
        (data ?? []).forEach((row) => {
            const key = `${row.clinic_id}-${row.doctor_id}`;
            if (!map.has(key)) map.set(key, { key, doctorId: row.doctor_id, clinicId: row.clinic_id, doctor: row.doctorName, branch: row.clinicName, rows: [] });
            map.get(key).rows.push(row);
        });
        return [...map.values()];
    }, [data]);

    const count = (state) => (data ?? []).filter((row) => row.queue_state === state).length;

    const [busy, setBusy] = useState(null);
    const next = (queue) => {
        setBusy("q" + queue.key);
        post("next-patient", { doctor_id: queue.doctorId, clinic_id: queue.clinicId })
            .then((result) => {
                result.current ? toast.success(`دور رقم ${result.current.queue_number}: ${result.current.name}`) : toast.info("مفيش حد في الانتظار");
                reload(true);
            })
            .catch((err) => toast.error(errorMessage(err)))
            .finally(() => setBusy(null));
    };
    const checkIn = (row) => {
        setBusy("v" + row.id);
        post("check-in-reservation", { id: row.id })
            .then(() => {
                toast.success(`${row.name} وصل`);
                reload(true);
            })
            .catch((err) => toast.error(errorMessage(err)))
            .finally(() => setBusy(null));
    };
    const noShow = (row) => {
        setBusy("n" + row.id);
        post("clinic/edit-reservation", { id: row.id, status: STATUS.NO_SHOW })
            .then(() => {
                toast.info(`${row.name}: لم يحضر`);
                reload(true);
            })
            .catch((err) => toast.error(errorMessage(err)))
            .finally(() => setBusy(null));
    };

    return (
        <>
            <PageHeader
                title="الدور"
                subtitle={isToday ? `النهارده · ${longDate(date)}` : longDate(date)}
                actions={
                    <>
                        <Input type="date" value={date} onChange={(e) => setDate(e.target.value || todayString())} className="w-auto" />
                        {seesBranches && (branches.data?.length ?? 0) > 1 && (
                            <Select value={clinicId} onChange={(e) => { setClinicId(e.target.value); setDoctorId(""); }} className="w-auto">
                                <option value="">كل الفروع</option>
                                {branches.data.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                            </Select>
                        )}
                        {user.role !== "doctor" && (
                            <Select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className="w-auto">
                                <option value="">كل الدكاترة</option>
                                {doctors.data?.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}
                            </Select>
                        )}
                        <Button variant="secondary" size="icon" title="تحديث" onClick={() => reload()}><RefreshCw className="h-4 w-4" /></Button>
                        {desk && <ButtonLink to="/reservations-list/add" icon={CalendarPlus} className="sm:hidden">حجز</ButtonLink>}
                    </>
                }
            />

            {data?.length > 0 && (
                <div className="mb-6 flex flex-wrap gap-2">
                    {["with_doctor", "waiting", "not_arrived", "done"].map((state) => (
                        <span key={state} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm">
                            <Badge tone={QUEUE_STATES[state].tone} dot>{QUEUE_STATES[state].name}</Badge>
                            <span className="font-semibold text-slate-900">{count(state)}</span>
                        </span>
                    ))}
                </div>
            )}

            {loading ? (
                <PageLoader />
            ) : !queues.length ? (
                <Card>
                    <EmptyState
                        icon={ListOrdered}
                        title={isToday ? "مفيش حجوزات النهارده لسه" : "مفيش حجوزات في اليوم ده"}
                        action={desk && <ButtonLink to="/reservations-list/add" icon={CalendarPlus}>حجز جديد</ButtonLink>}
                    />
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    {queues.map((queue) => (
                        <QueueCard
                            key={queue.key}
                            queue={queue}
                            desk={desk}
                            canCall={isToday && (desk || user.role === "doctor")}
                            canCheckIn={isToday && desk}
                            busy={busy}
                            onNext={() => next(queue)}
                            onCheckIn={checkIn}
                            onNoShow={noShow}
                        />
                    ))}
                </div>
            )}
        </>
    );
};

const QueueCard = ({ queue, desk, canCall, canCheckIn, busy, onNext, onCheckIn, onNoShow }) => {
    const navigate = useNavigate();
    // A booking whose time has passed without the patient can be marked "didn't come"
    const now = new Date().toTimeString().slice(0, 5);
    const current = queue.rows.find((row) => row.queue_state === "with_doctor");
    const waiting = queue.rows.filter((row) => row.queue_state === "waiting").length;

    return (
        <Card className="flex flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{queue.doctor}</p>
                    <p className="text-xs text-slate-500">{queue.branch} · {waiting} في الانتظار</p>
                </div>
                {canCall && (
                    <Button icon={SkipForward} onClick={onNext} loading={busy === "q" + queue.key} className="[&>svg]:rotate-180">
                        المريض التالي
                    </Button>
                )}
            </div>

            {/* Now with the doctor */}
            <div className="flex items-center gap-4 bg-gradient-to-l from-brand-50/60 to-white px-5 py-4">
                <span className={clsx("flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold", current ? "bg-brand-600 text-white shadow-sm" : "bg-slate-100 text-slate-400")}>
                    {current ? current.queue_number : "–"}
                </span>
                <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500">عند الدكتور الآن</p>
                    <p className="truncate text-lg font-semibold text-slate-900">{current ? current.name : "لا يوجد"}</p>
                    {current && <p className="text-xs text-slate-500">{current.serviceName}</p>}
                </div>
                {current && (
                    <ButtonLink to={`/reservations-list/${current.id}`} variant="secondary" size="sm" icon={FileText} className="ms-auto shrink-0">
                        فتح الكشف
                    </ButtonLink>
                )}
            </div>

            {/* The day in turn order */}
            <ul className="flex-1 divide-y divide-slate-100">
                {queue.rows.map((row) => {
                    const state = QUEUE_STATES[row.queue_state] ?? QUEUE_STATES.not_arrived;
                    const finished = ["done", "canceled", "no_show"].includes(row.queue_state);
                    return (
                        <li
                            key={row.id}
                            onClick={() => navigate(`/reservations-list/${row.id}`)}
                            className={clsx("flex cursor-pointer items-center gap-3 px-5 py-3 transition hover:bg-slate-50", finished && "opacity-55", row.queue_state === "with_doctor" && "bg-brand-50/40")}
                        >
                            <span className="w-7 shrink-0 text-center text-base font-bold text-brand-700">{row.queue_number}</span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-900">{row.name}</p>
                                <p className="truncate text-xs text-slate-500">
                                    {row.serviceName}
                                    {row.time && ` · ${row.time}`}
                                    {` · ${labelOf(BOOKING_TYPES, row.booking_type)}`}
                                    {row.is_followup && " · إعادة"}
                                </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                {desk && !["canceled", "no_show"].includes(row.queue_state) && (
                                    row.net_price === 0 ? <Badge tone="green">مجاني</Badge>
                                        : row.remaining > 0 ? <Badge tone="amber">متبقي {money(row.remaining)}</Badge>
                                            : <Badge tone="green">مدفوع</Badge>
                                )}
                                {canCheckIn && row.queue_state === "not_arrived" ? (
                                    <>
                                        {row.time && row.time < now && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                icon={UserX}
                                                title="لم يحضر"
                                                loading={busy === "n" + row.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onNoShow(row);
                                                }}
                                                className="text-slate-500 hover:text-red-600"
                                            >
                                                <span className="hidden sm:inline">لم يحضر</span>
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="soft"
                                            icon={UserCheck}
                                            loading={busy === "v" + row.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onCheckIn(row);
                                            }}
                                        >
                                            وصل
                                        </Button>
                                    </>
                                ) : (
                                    <Badge tone={state.tone}>{state.name}</Badge>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ul>
        </Card>
    );
};

export default Queue;
