import { useState } from "react";
import { AlertTriangle, HeartPulse, Pencil, Pill } from "lucide-react";
import { Badge, Button, Card, CardHeader, Field, Modal, Textarea, useToast } from "../../ui";
import { errorMessage, post } from "../../lib/api";
import TagInput from "./TagInput";

const CHRONIC = ["سكر", "ضغط", "أمراض قلب", "ربو", "غدة درقية", "كلى", "كبد", "صرع", "روماتيزم"];
const ALLERGIES = ["بنسلين", "أسبرين", "سلفا", "مسكنات (NSAIDs)", "يود", "لاتكس", "ليدوكايين (بنج موضعي)"];

const updatedOn = (value) =>
    new Date(value).toLocaleDateString("ar-EG-u-nu-latn", { day: "numeric", month: "long", year: "numeric" });

/**
 * What every doctor should know before seeing the patient: long-term
 * conditions, allergies, regular medicines and notes. Doctors and the owner
 * keep it up to date.
 */
const MedicalBackground = ({ patientId, medical, canEdit, onSaved }) => {
    const [editing, setEditing] = useState(false);
    const empty = !medical.chronic.length && !medical.allergies.length && !medical.medications.length && !medical.notes;

    return (
        <Card>
            <CardHeader
                title="الملف الطبي"
                description={medical.updated_at ? `آخر تحديث: ${medical.updated_by} · ${updatedOn(medical.updated_at)}` : undefined}
                actions={canEdit && <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(true)}>تعديل</Button>}
            />
            <div className="space-y-4 p-5 text-sm">
                {empty ? (
                    <p className="text-slate-500">مفيش أمراض مزمنة او حساسية او أدوية متسجلة.</p>
                ) : (
                    <>
                        {medical.allergies.length > 0 && (
                            <div>
                                <p className="mb-1.5 flex items-center gap-1.5 font-medium text-red-700"><AlertTriangle className="h-4 w-4" /> حساسية</p>
                                <div className="flex flex-wrap gap-1.5">{medical.allergies.map((item) => <Badge key={item} tone="red">{item}</Badge>)}</div>
                            </div>
                        )}
                        {medical.chronic.length > 0 && (
                            <div>
                                <p className="mb-1.5 flex items-center gap-1.5 font-medium text-slate-700"><HeartPulse className="h-4 w-4 text-amber-600" /> أمراض مزمنة</p>
                                <div className="flex flex-wrap gap-1.5">{medical.chronic.map((item) => <Badge key={item} tone="amber">{item}</Badge>)}</div>
                            </div>
                        )}
                        {medical.medications.length > 0 && (
                            <div>
                                <p className="mb-1.5 flex items-center gap-1.5 font-medium text-slate-700"><Pill className="h-4 w-4 text-brand-600" /> أدوية مستمرة</p>
                                <ul className="list-inside list-disc space-y-0.5 text-slate-700">{medical.medications.map((item) => <li key={item}>{item}</li>)}</ul>
                            </div>
                        )}
                        {medical.notes && <p className="whitespace-pre-line rounded-lg bg-slate-50 px-3 py-2 text-slate-700">{medical.notes}</p>}
                    </>
                )}
            </div>
            {editing && (
                <EditBackground
                    patientId={patientId}
                    medical={medical}
                    onClose={() => setEditing(false)}
                    onSaved={(saved) => {
                        onSaved(saved);
                        setEditing(false);
                    }}
                />
            )}
        </Card>
    );
};

const EditBackground = ({ patientId, medical, onClose, onSaved }) => {
    const toast = useToast();
    const [form, setForm] = useState({ chronic: medical.chronic, allergies: medical.allergies, medications: medical.medications, notes: medical.notes });
    const [saving, setSaving] = useState(false);
    const set = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));

    const save = () => {
        setSaving(true);
        post("patient-medical", { patient_id: patientId, ...form })
            .then((saved) => {
                toast.success("تم حفظ الملف الطبي");
                onSaved(saved);
            })
            .catch((err) => toast.error(errorMessage(err)))
            .finally(() => setSaving(false));
    };

    return (
        <Modal
            open
            onClose={onClose}
            size="lg"
            title="الملف الطبي"
            description="بيظهر لكل دكاترة المجموعة في كل كشف، والاستقبال مش بيشوفه"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>الغاء</Button>
                    <Button onClick={save} loading={saving}>حفظ</Button>
                </>
            }
        >
            <div className="space-y-5">
                <TagInput label="حساسية" tone="red" values={form.allergies} onChange={set("allergies")} suggestions={ALLERGIES} placeholder="اكتب واضغط Enter" />
                <TagInput label="أمراض مزمنة" tone="amber" values={form.chronic} onChange={set("chronic")} suggestions={CHRONIC} placeholder="اكتب واضغط Enter" />
                <TagInput label="أدوية مستمرة" values={form.medications} onChange={set("medications")} placeholder="اسم الدواء والجرعة، واضغط Enter" />
                <Field label="ملاحظات">
                    <Textarea value={form.notes} onChange={(e) => set("notes")(e.target.value)} rows={3} maxLength={2000} />
                </Field>
            </div>
        </Modal>
    );
};

export default MedicalBackground;
