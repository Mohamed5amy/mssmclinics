import { useEffect, useState } from "react";
import { FileText, Paperclip, Trash2, Upload } from "lucide-react";
import { Badge, Button, Card, CardHeader, ConfirmDialog, Field, Input, Modal, Segmented, Spinner, useToast } from "../../ui";
import { api, errorMessage, getFile, post } from "../../lib/api";
import { labelOf } from "../../constants/visits";

const KINDS = [
    { id: "lab", name: "تحليل" },
    { id: "radiology", name: "أشعة" },
    { id: "report", name: "تقرير" },
    { id: "other", name: "أخرى" },
];
const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
const MAX_BYTES = 10 * 1024 * 1024;

const isImage = (item) => item.content_type.startsWith("image/");
const shortDate = (value) => new Date(value).toLocaleDateString("ar-EG-u-nu-latn", { day: "numeric", month: "short", year: "numeric" });

// An attachment's bytes as an object URL; the API needs the token, so no plain <img src>.
const useFileUrl = (item, wanted = true) => {
    const [url, setUrl] = useState(null);
    useEffect(() => {
        if (!wanted) return undefined;
        let made = null;
        let gone = false;
        getFile(`patient-attachment/${item.id}`)
            .then((blob) => {
                if (gone) return;
                made = URL.createObjectURL(blob);
                setUrl(made);
            })
            .catch(() => {});
        return () => {
            gone = true;
            if (made) URL.revokeObjectURL(made);
        };
    }, [item.id, wanted]);
    return url;
};

/**
 * Lab results, scans and reports in the patient's file: images open in place,
 * PDFs in a new tab. Doctors and the owner add them; the owner removes any,
 * a doctor the ones they added.
 *   reservationId: the visit new files are added during, if any
 */
const Attachments = ({ patientId, reservationId, items, onChange, canUpload, canDelete }) => {
    const toast = useToast();
    const [adding, setAdding] = useState(false);
    const [preview, setPreview] = useState(null);
    const [removing, setRemoving] = useState(null);
    const [busy, setBusy] = useState(false);

    const open = (item) => {
        if (isImage(item)) return setPreview(item);
        // A tab opened now, while the click still counts, so the browser doesn't block it
        const tab = window.open("", "_blank");
        getFile(`patient-attachment/${item.id}`)
            .then((blob) => {
                if (tab) tab.location.href = URL.createObjectURL(blob);
            })
            .catch((err) => {
                tab?.close();
                toast.error(errorMessage(err));
            });
    };

    const remove = () => {
        setBusy(true);
        post("delete-patient-attachment", { id: removing.id })
            .then(() => {
                onChange(items.filter((item) => item.id !== removing.id));
                setRemoving(null);
                toast.success("تم حذف الملف");
            })
            .catch((err) => toast.error(errorMessage(err)))
            .finally(() => setBusy(false));
    };

    return (
        <Card>
            <CardHeader
                title="المرفقات"
                description="تحاليل وأشعة وتقارير"
                actions={canUpload && <Button size="sm" variant="soft" icon={Upload} onClick={() => setAdding(true)}>إضافة ملف</Button>}
            />
            {items.length ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-3 p-5">
                    {items.map((item) => (
                        <Tile key={item.id} item={item} onOpen={() => open(item)} onRemove={canDelete(item) ? () => setRemoving(item) : null} />
                    ))}
                </div>
            ) : (
                <p className="flex items-center gap-2 px-5 py-6 text-sm text-slate-500"><Paperclip className="h-4 w-4" /> مفيش ملفات</p>
            )}

            {adding && (
                <AddFile
                    patientId={patientId}
                    reservationId={reservationId}
                    onClose={() => setAdding(false)}
                    onAdded={(row) => {
                        onChange([row, ...items]);
                        setAdding(false);
                    }}
                />
            )}
            {preview && <Preview item={preview} onClose={() => setPreview(null)} />}
            <ConfirmDialog
                open={!!removing}
                onClose={() => setRemoving(null)}
                onConfirm={remove}
                loading={busy}
                title="حذف الملف؟"
                message={removing ? `${removing.title || removing.file_name} هيتحذف نهائياً من ملف المريض.` : ""}
                confirmLabel="حذف"
            />
        </Card>
    );
};

const Tile = ({ item, onOpen, onRemove }) => {
    const url = useFileUrl(item, isImage(item));
    return (
        <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white">
            <button type="button" onClick={onOpen} className="block w-full text-start">
                <div className="flex h-24 items-center justify-center bg-slate-50">
                    {isImage(item) ? (
                        url ? <img src={url} alt={item.title || item.file_name} className="h-full w-full object-cover" /> : <Spinner className="h-4 w-4" />
                    ) : (
                        <FileText className="h-8 w-8 text-red-500" />
                    )}
                </div>
                <div className="space-y-1 p-2.5">
                    <Badge tone="blue">{labelOf(KINDS, item.kind)}</Badge>
                    <p className="truncate text-sm font-medium text-slate-900">{item.title || item.file_name}</p>
                    <p className="truncate text-[11px] text-slate-500">{shortDate(item.created_at)} · {item.uploaded_by_name}</p>
                </div>
            </button>
            {onRemove && (
                <button
                    type="button"
                    onClick={onRemove}
                    className="absolute end-1.5 top-1.5 rounded-lg bg-white/90 p-1.5 text-slate-500 opacity-0 shadow-sm transition hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
                    title="حذف"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            )}
        </div>
    );
};

const Preview = ({ item, onClose }) => {
    const url = useFileUrl(item);
    return (
        <Modal open onClose={onClose} size="xl" title={item.title || item.file_name} description={`${labelOf(KINDS, item.kind)} · ${shortDate(item.created_at)} · ${item.uploaded_by_name}`}>
            <div className="flex min-h-[12rem] items-center justify-center">
                {url ? <img src={url} alt={item.title || item.file_name} className="max-h-[70vh] rounded-lg object-contain" /> : <Spinner />}
            </div>
        </Modal>
    );
};

const AddFile = ({ patientId, reservationId, onClose, onAdded }) => {
    const toast = useToast();
    const [file, setFile] = useState(null);
    const [kind, setKind] = useState("lab");
    const [title, setTitle] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const pick = (chosen) => {
        setError(chosen && chosen.size > MAX_BYTES ? "الملف اكبر من 10 ميجا" : "");
        setFile(chosen ?? null);
    };

    const save = () => {
        if (!file) return setError("اختر الملف");
        if (error) return;
        const form = new FormData();
        form.append("patient_id", patientId);
        if (reservationId) form.append("reservation_id", reservationId);
        form.append("kind", kind);
        form.append("title", title);
        form.append("file", file);
        setSaving(true);
        api.post("patient-attachments", form)
            .then((res) => {
                toast.success("تم إضافة الملف");
                onAdded(res.data.data);
            })
            .catch((err) => setError(errorMessage(err)))
            .finally(() => setSaving(false));
    };

    return (
        <Modal
            open
            onClose={onClose}
            title="إضافة ملف"
            description="صورة او PDF، لحد 10 ميجا"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>الغاء</Button>
                    <Button onClick={save} loading={saving}>إضافة</Button>
                </>
            }
        >
            <div className="space-y-4">
                <Field label="الملف" required error={error}>
                    <input
                        type="file"
                        accept={ACCEPT}
                        onChange={(e) => pick(e.target.files?.[0])}
                        className="block w-full text-sm text-slate-600 file:me-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
                    />
                </Field>
                <div>
                    <p className="mb-1.5 text-sm font-medium text-slate-700">نوعه</p>
                    <Segmented options={KINDS} value={kind} onChange={setKind} />
                </div>
                <Field label="عنوان" hint="اختياري، مثلاً: صورة دم كاملة">
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
                </Field>
            </div>
        </Modal>
    );
};

export default Attachments;
