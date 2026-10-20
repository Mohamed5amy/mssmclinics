import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Headset, KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, ConfirmDialog, DataTable, Field, Input, Modal, PageHeader, Select, useToast } from "../../ui";
import { errorMessage, fieldErrors, post } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { currentUser } from "../../constants/session";
import BranchPicker from "../../components/BranchPicker/BranchPicker";
import ResetPassword from "../../components/ResetPassword/ResetPassword";
import { PASSWORD_HINT, validPassword } from "../../lib/password";

// Front-desk accounts, one branch each. They sign in on the same page, register
// patients, book and take payments, and never see income, settings, doctors'
// percentages or diagnoses. The owner manages them; the platform can only look.
const Receptionists = () => {
    const user = currentUser();
    const owner = user.role === "owner";
    const platform = user.role === "admin";
    const toast = useToast();

    const [clinicId, setClinicId] = useState("");
    const branches = useApi("list-clinic");
    const { data, loading, reload } = useApi("list-receptionists", { clinic_id: clinicId });

    const [editing, setEditing] = useState(null); // {} for a new one
    const [resetting, setResetting] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [busy, setBusy] = useState(false);

    const remove = () => {
        setBusy(true);
        post("delete-receptionist", { id: deleting.id })
            .then(() => {
                toast.success("تم حذف الحساب");
                setDeleting(null);
                reload(true);
            })
            .catch((err) => toast.error(errorMessage(err)))
            .finally(() => setBusy(false));
    };

    return (
        <>
            <PageHeader
                title="الاستقبال"
                subtitle="كل موظف تابع لفرع واحد"
                actions={owner && <Button icon={Plus} onClick={() => setEditing({})}>موظف استقبال جديد</Button>}
            />
            <Card>
                <div className="border-b border-slate-100 p-4">
                    <Select value={clinicId} onChange={(e) => setClinicId(e.target.value)} className="w-auto min-w-44">
                        <option value="">كل الفروع</option>
                        {branches.data?.map((branch) => (
                            <option key={branch.id} value={branch.id}>{branch.name}{platform ? ` · ${branch.groupName}` : ""}</option>
                        ))}
                    </Select>
                </div>
                <DataTable
                    loading={loading}
                    rows={data}
                    emptyIcon={Headset}
                    empty="لا يوجد موظفي استقبال"
                    emptyText={owner ? "ضيف موظف لكل فرع عشان يسجل الحجوزات والمدفوعات" : undefined}
                    columns={[
                        { key: "name", header: "الاسم", render: (row) => <span className="font-medium text-slate-900">{row.name}</span> },
                        { key: "clinicName", header: "الفرع", render: (row) => <Badge tone="blue">{row.clinicName}</Badge> },
                        { key: "email", header: "الايميل", render: (row) => <span className="ltr-nums">{row.email}</span> },
                        { key: "phone", header: "الهاتف", render: (row) => <span className="ltr-nums">{row.phone}</span> },
                        ...(platform ? [{ key: "groupName", header: "المجموعة" }] : []),
                        ...(owner
                            ? [{
                                key: "actions",
                                header: "",
                                className: "w-0",
                                render: (row) => (
                                    <div className="flex justify-end gap-1">
                                        <Button size="icon" variant="ghost" title="تعديل" onClick={() => setEditing(row)}><Pencil className="h-4 w-4" /></Button>
                                        <Button size="icon" variant="ghost" title="كلمة المرور" onClick={() => setResetting(row)}><KeyRound className="h-4 w-4" /></Button>
                                        <Button size="icon" variant="danger-ghost" title="حذف" onClick={() => setDeleting(row)}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                ),
                            }]
                            : []),
                    ]}
                />
            </Card>

            {editing && (
                <ReceptionistForm
                    receptionist={editing}
                    onClose={() => setEditing(null)}
                    onSaved={() => {
                        setEditing(null);
                        reload(true);
                    }}
                />
            )}
            {resetting && <ResetPassword name={resetting.name} id={resetting.id} endpoint="update-receptionist-password" onClose={() => setResetting(null)} />}
            <ConfirmDialog
                open={!!deleting}
                onClose={() => setDeleting(null)}
                onConfirm={remove}
                loading={busy}
                title={`حذف ${deleting?.name ?? ""}؟`}
                message="مش هيقدر يسجل دخول تاني. المدفوعات اللي سجلها بتفضل محفوظة."
                confirmLabel="حذف"
            />
        </>
    );
};

const ReceptionistForm = ({ receptionist, onClose, onSaved }) => {
    const toast = useToast();
    const editing = !!receptionist.id;
    const { register, handleSubmit, reset, formState: { errors } } = useForm();
    const [clinicId, setClinicId] = useState(receptionist.clinic_id ?? "");
    const [serverErrors, setServerErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        reset({ name: receptionist.name, phone: receptionist.phone, email: receptionist.email });
    }, [receptionist, reset]);

    const save = handleSubmit((data) => {
        if (!clinicId) return setServerErrors({ clinic_id: "اختر الفرع" });
        setSaving(true);
        post(editing ? "clinic/edit-receptionist" : "clinic/add-receptionist", { ...data, clinic_id: clinicId, ...(editing ? { id: receptionist.id } : {}) })
            .then(() => {
                toast.success(editing ? "تم حفظ التعديلات" : "تم إضافة الحساب");
                onSaved();
            })
            .catch((err) => {
                const errs = fieldErrors(err);
                if (err?.response?.status === 409) errs.email = "هذا الايميل مسجل بالفعل";
                setServerErrors(errs);
                toast.error(errorMessage(err));
            })
            .finally(() => setSaving(false));
    });

    const error = (name) => errors[name]?.message || serverErrors[name];

    return (
        <Modal
            open
            onClose={onClose}
            title={editing ? "تعديل موظف الاستقبال" : "موظف استقبال جديد"}
            description="بيسجل الدخول من نفس صفحة الدخول بالايميل ده"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>الغاء</Button>
                    <Button onClick={save} loading={saving}>{editing ? "حفظ" : "إضافة"}</Button>
                </>
            }
        >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="الاسم" required error={error("name")}>
                    <Input invalid={!!error("name")} {...register("name", { required: "ادخل الاسم" })} />
                </Field>
                <Field label="رقم الهاتف" required error={error("phone")}>
                    <Input type="tel" dir="ltr" className="text-end" invalid={!!error("phone")} {...register("phone", { required: "ادخل رقم الهاتف" })} />
                </Field>
                <Field label="الايميل" required error={error("email")} className="sm:col-span-2">
                    <Input type="email" dir="ltr" invalid={!!error("email")} {...register("email", { required: "ادخل الايميل" })} />
                </Field>
                {!editing && (
                    <Field label="كلمة المرور" required error={error("password")} hint={PASSWORD_HINT}>
                        <Input type="password" dir="ltr" invalid={!!error("password")} {...register("password", { required: "ادخل كلمة المرور", validate: validPassword })} />
                    </Field>
                )}
                <BranchPicker value={clinicId} onChange={setClinicId} error={error("clinic_id")} hint={editing ? "تغيير الفرع بينقله فوراً" : undefined} />
            </div>
        </Modal>
    );
};

export default Receptionists;
