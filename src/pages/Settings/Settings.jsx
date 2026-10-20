import { useEffect, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Alert, Button, Card, CardBody, CardHeader, Checkbox, ConfirmDialog, Field, Input, PageHeader, PageLoader, Segmented, Switch, Tabs, useToast } from "../../ui";
import { errorMessage, get, post } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { currentUser } from "../../constants/session";
import { FOLLOWUP_MODES, money } from "../../constants/visits";

const TABS = [
    { key: "services", label: "الخدمات والأسعار" },
    { key: "followup", label: "الإعادة" },
    { key: "specialties", label: "التخصصات" },
    { key: "providers", label: "عرفونا عن طريق" },
];

// The group's settings - one price list and one set of lists for all its branches.
const Settings = () => {
    const [tab, setTab] = useState("services");
    return (
        <>
            <PageHeader title="الإعدادات" subtitle={`${currentUser().groupName} · بتطبق على كل الفروع`} />
            <Tabs tabs={TABS} value={tab} onChange={setTab} className="mb-6" />
            {tab === "services" && <Services />}
            {tab === "followup" && <FollowUp />}
            {tab === "specialties" && <TitleList url="specialties" add="clinic/specialties" remove="delete-specialties" title="التخصصات" description="بتختار منها تخصص كل دكتور" placeholder="مثلاً: باطنة" />}
            {tab === "providers" && <TitleList url="providers" add="clinic/providers" remove="delete-providers" title="عرفونا عن طريق" description="بتسأل المريض عنها وهو بيتسجل" placeholder="مثلاً: فيسبوك" />}
        </>
    );
};

// Services and their prices, edited in place.
const Services = () => {
    const toast = useToast();
    const { data, loading, reload } = useApi("services");
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [busy, setBusy] = useState(false);

    const add = (e) => {
        e.preventDefault();
        setBusy(true);
        post("clinic/services", { name, price: +price })
            .then(() => {
                toast.success("تم إضافة الخدمة");
                setName("");
                setPrice("");
                reload(true);
            })
            .catch((err) => toast.error(errorMessage(err, "الخدمة دي موجودة بالفعل")))
            .finally(() => setBusy(false));
    };

    const save = () => {
        setBusy(true);
        post("clinic/update-services", { id: editing.id, name: editing.name, price: +editing.price })
            .then(() => {
                toast.success("تم حفظ الخدمة");
                setEditing(null);
                reload(true);
            })
            .catch((err) => toast.error(errorMessage(err)))
            .finally(() => setBusy(false));
    };

    const remove = () => {
        setBusy(true);
        post("delete-services", { id: deleting.id })
            .then(() => {
                toast.success("تم حذف الخدمة");
                setDeleting(null);
                reload(true);
            })
            .catch((err) => toast.error(errorMessage(err)))
            .finally(() => setBusy(false));
    };

    return (
        <Card>
            <CardHeader title="الخدمات والأسعار" description="تغيير السعر مش بيغير الكشوفات القديمة" />
            <form onSubmit={add} className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-5">
                <Field label="اسم الخدمة" className="min-w-48 flex-1">
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً: كشف" />
                </Field>
                <Field label="السعر (جنيه)" className="w-36">
                    <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
                </Field>
                <Button type="submit" icon={Plus} loading={busy && !editing && !deleting} disabled={!name || price === ""}>إضافة</Button>
            </form>
            {loading ? (
                <PageLoader />
            ) : (
                <ul className="divide-y divide-slate-100">
                    {data?.map((service) => (
                        <li key={service.id} className="flex items-center gap-3 px-5 py-3">
                            {editing?.id === service.id ? (
                                <>
                                    <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="flex-1" />
                                    <Input type="number" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} className="w-32" />
                                    <Button size="icon" variant="soft" onClick={save} loading={busy}><Check className="h-4 w-4" /></Button>
                                    <Button size="icon" variant="ghost" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
                                </>
                            ) : (
                                <>
                                    <span className="flex-1 font-medium text-slate-800">{service.name}</span>
                                    <span className="text-sm font-semibold text-slate-700">{money(service.price)}</span>
                                    <Button size="icon" variant="ghost" title="تعديل" onClick={() => setEditing({ ...service })}><Pencil className="h-4 w-4" /></Button>
                                    <Button size="icon" variant="danger-ghost" title="حذف" onClick={() => setDeleting(service)}><Trash2 className="h-4 w-4" /></Button>
                                </>
                            )}
                        </li>
                    ))}
                    {!data?.length && <li className="px-5 py-10 text-center text-sm text-slate-500">لسه مفيش خدمات</li>}
                </ul>
            )}
            <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} loading={busy} title={`حذف "${deleting?.name}"؟`} message="الكشوفات القديمة بتفضل محفوظة بسعرها." confirmLabel="حذف" />
        </Card>
    );
};

// A simple list of titles: specialties, or how patients heard about the clinic.
const TitleList = ({ url, add, remove, title, description, placeholder }) => {
    const toast = useToast();
    const { data, loading, reload } = useApi(url);
    const [text, setText] = useState("");
    const [deleting, setDeleting] = useState(null);
    const [busy, setBusy] = useState(false);

    const submit = (e) => {
        e.preventDefault();
        setBusy(true);
        post(add, { title: text })
            .then(() => {
                setText("");
                reload(true);
            })
            .catch((err) => toast.error(errorMessage(err, "موجودة بالفعل")))
            .finally(() => setBusy(false));
    };

    const confirmRemove = () => {
        setBusy(true);
        post(remove, { id: deleting.id })
            .then(() => {
                setDeleting(null);
                reload(true);
            })
            .catch((err) => toast.error(errorMessage(err)))
            .finally(() => setBusy(false));
    };

    return (
        <Card>
            <CardHeader title={title} description={description} />
            <CardBody>
                <form onSubmit={submit} className="flex gap-3">
                    <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} className="max-w-sm" />
                    <Button type="submit" icon={Plus} disabled={!text.trim()} loading={busy && !deleting}>إضافة</Button>
                </form>
                {loading ? (
                    <PageLoader />
                ) : (
                    <div className="mt-5 flex flex-wrap gap-2">
                        {data?.map((item) => (
                            <span key={item.id} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pe-1.5 ps-3 text-sm font-medium text-slate-700">
                                {item.title}
                                <button type="button" onClick={() => setDeleting(item)} className="rounded p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="حذف">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </span>
                        ))}
                        {!data?.length && <p className="text-sm text-slate-500">القائمة فاضية</p>}
                    </div>
                )}
            </CardBody>
            <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={confirmRemove} loading={busy} title={`حذف "${deleting?.title}"؟`} confirmLabel="حذف" />
        </Card>
    );
};

// The re-visit rule (الإعادة): coming back to the same doctor within N days of a
// full visit is free or cheaper, at any branch. Applied automatically when booking.
const FollowUp = () => {
    const toast = useToast();
    const services = useApi("services");
    const [rule, setRule] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        get("clinic/settings").then((settings) => setRule(settings.followup));
    }, []);

    if (!rule || services.loading) return <PageLoader />;

    const change = (key, value) => {
        setRule((current) => ({ ...current, [key]: value }));
        setError("");
    };
    const toggleService = (id) => change("service_ids", rule.service_ids.includes(id) ? rule.service_ids.filter((item) => item !== id) : [...rule.service_ids, id]);

    const save = () => {
        if (!(+rule.days >= 1)) return setError("عدد الأيام لازم يكون 1 على الاقل");
        if (rule.mode === "percent" && +rule.value > 100) return setError("النسبة مينفعش تزيد عن 100%");
        if (rule.enabled && rule.service_ids.length === 0) return setError("اختر خدمة واحدة على الاقل");

        setSaving(true);
        post("clinic/settings", { followup: { ...rule, days: +rule.days, value: rule.mode === "free" ? 0 : +rule.value || 0 } })
            .then((settings) => {
                setRule(settings.followup);
                toast.success("تم حفظ قاعدة الإعادة");
            })
            .catch((err) => setError(errorMessage(err)))
            .finally(() => setSaving(false));
    };

    const example = (() => {
        const service = services.data?.find((item) => rule.service_ids.includes(item.id));
        if (!service) return null;
        const price = rule.mode === "free" ? 0 : rule.mode === "percent" ? Math.round((service.price * (+rule.value || 0)) / 100) : Math.min(+rule.value || 0, service.price);
        return `${service.name} بـ ${money(service.price)}، ولو رجع لنفس الدكتور خلال ${rule.days || 0} يوم: ${price === 0 ? "مجاناً" : money(price)}`;
    })();

    return (
        <Card className="max-w-3xl">
            <CardHeader title="سعر الإعادة" description="لما المريض يرجع لنفس الدكتور خلال مدة معينة من آخر كشف كامل، في أي فرع" />
            <CardBody className="space-y-6">
                <Switch checked={rule.enabled} onChange={(value) => change("enabled", value)} label="تفعيل سعر الإعادة" />

                <div className={rule.enabled ? "space-y-6" : "pointer-events-none space-y-6 opacity-50"}>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <Field label="خلال كام يوم من الكشف">
                            <Input type="number" min={1} value={rule.days} onChange={(e) => change("days", e.target.value)} />
                        </Field>
                        {rule.mode !== "free" && (
                            <Field label={rule.mode === "percent" ? "النسبة من سعر الكشف %" : "السعر (جنيه)"}>
                                <Input type="number" min={0} value={rule.value} onChange={(e) => change("value", e.target.value)} />
                            </Field>
                        )}
                    </div>

                    <div>
                        <p className="mb-1.5 text-sm font-medium text-slate-700">سعر الإعادة</p>
                        <Segmented options={FOLLOWUP_MODES} value={rule.mode} onChange={(value) => change("mode", value)} />
                    </div>

                    <div>
                        <p className="mb-2 text-sm font-medium text-slate-700">الخدمات اللي بتعتبر كشف كامل</p>
                        <div className="flex flex-wrap gap-x-6 gap-y-3">
                            {services.data?.map((service) => (
                                <Checkbox key={service.id} checked={rule.service_ids.includes(service.id)} onChange={() => toggleService(service.id)} label={`${service.name} (${money(service.price)})`} />
                            ))}
                        </div>
                    </div>

                    {example && <Alert tone="info">مثال: {example}</Alert>}
                </div>

                {error && <p className="text-sm font-medium text-red-600">{error}</p>}
                <Button onClick={save} loading={saving}>حفظ</Button>
            </CardBody>
        </Card>
    );
};

export default Settings;
