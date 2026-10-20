import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useIsAuthenticated, useSignIn } from "react-auth-kit";
import { useNavigate } from "react-router-dom";
import { CalendarCheck2, Eye, EyeOff, ListOrdered, Wallet } from "lucide-react";
import logo from "../../images/text.svg";
import { Alert, Button, Field, Input } from "../../ui";
import { OFFLINE, errorMessage, post } from "../../lib/api";
import { homeFor } from "../../constants/roles";
import { saveSession } from "../../constants/session";

// Why the last session ended (see constants/session.js)
const REASONS = {
    suspended: "تم إيقاف حساب المجموعة. تواصل مع إدارة المنصة",
    closed: "هذا الفرع مغلق حالياً",
    expired: "انتهت الجلسة، سجل الدخول مرة اخري",
    password: "كلمة المرور اتغيرت، ادخل بالكلمة الجديدة",
};

const FEATURES = [
    { icon: ListOrdered, text: "الدور لكل دكتور في كل فرع" },
    { icon: CalendarCheck2, text: "حجز مسبق او بدون حجز، وسعر الإعادة تلقائي" },
    { icon: Wallet, text: "المدفوعات كاش وإنستاباي وفودافون كاش" },
];

// One sign-in form for everyone: the email says whether it is the platform,
// a group owner, a doctor or a receptionist.
const Login = () => {
    const isAuthenticated = useIsAuthenticated();
    const navigate = useNavigate();
    const signIn = useSignIn();

    useEffect(() => {
        isAuthenticated() && localStorage.getItem("token") && navigate(homeFor(localStorage.getItem("role")));
    }, [isAuthenticated, navigate]);

    const { register, handleSubmit, formState: { errors } } = useForm();
    const [failed, setFailed] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [reason] = useState(new URLSearchParams(window.location.search).get("reason"));

    const onSubmit = (data) => {
        setLoading(true);
        setFailed("");
        post("login", data)
            .then((user) => {
                signIn({ token: user.api_token, expiresIn: 3600, tokenType: "Bearer", authState: { email: user.email } });
                saveSession(user);
                navigate(homeFor(user.role));
            })
            .catch((err) => {
                const code = err?.response?.data?.code;
                setFailed(
                    !err?.response ? OFFLINE
                        : code === "GROUP_SUSPENDED" ? REASONS.suspended
                            : code === "BRANCH_CLOSED" ? REASONS.closed
                                : code === "TOO_MANY_ATTEMPTS" ? errorMessage(err)
                                    : "الايميل او كلمة المرور غير صحيحة",
                );
            })
            .finally(() => setLoading(false));
    };

    return (
        <div className="flex min-h-screen">
            {/* Form */}
            <div className="flex flex-1 items-center justify-center px-4 py-12">
                <div className="w-full max-w-sm">
                    <img src={logo} alt="MSSM" className="mb-10 h-10" />
                    <h1 className="text-2xl font-bold text-slate-900">تسجيل الدخول</h1>
                    <p className="mt-1.5 text-sm text-slate-500">ادخل بالايميل وكلمة المرور الخاصة بيك</p>

                    {reason && REASONS[reason] && !failed && (
                        <Alert tone="warning" className="mt-6">
                            {REASONS[reason]}
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
                        <Field label="الايميل" error={errors.email?.message}>
                            <Input
                                type="email"
                                dir="ltr"
                                autoComplete="email"
                                placeholder="name@example.com"
                                invalid={!!errors.email}
                                {...register("email", { required: "ادخل الايميل" })}
                            />
                        </Field>
                        <Field label="كلمة المرور" error={errors.password?.message}>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    dir="ltr"
                                    autoComplete="current-password"
                                    className="pe-10"
                                    invalid={!!errors.password}
                                    {...register("password", { required: "ادخل كلمة المرور" })}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((value) => !value)}
                                    className="absolute inset-y-0 end-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
                                    aria-label="اظهار كلمة المرور"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </Field>

                        {failed && <p className="text-sm font-medium text-red-600">{failed}</p>}

                        <Button type="submit" size="lg" className="w-full" loading={loading}>
                            دخول
                        </Button>
                    </form>
                    <p className="mt-6 text-center text-sm text-slate-500">
                        نسيت كلمة المرور؟ صاحب العيادة يقدر يغيّرهالك، ولو انت صاحب المجموعة كلّم إدارة MSSM.
                    </p>
                </div>
            </div>

            {/* Brand panel */}
            <div className="relative hidden w-[44%] overflow-hidden bg-gradient-to-br from-brand-600 to-brand-800 lg:block">
                <div className="absolute -start-24 -top-24 h-96 w-96 rounded-full bg-white/10" />
                <div className="absolute -bottom-32 -end-16 h-96 w-96 rounded-full bg-white/5" />
                <div className="relative flex h-full flex-col justify-center px-14 text-white">
                    <h2 className="text-3xl font-bold leading-snug">إدارة عيادتك<br />من مكان واحد</h2>
                    <p className="mt-3 max-w-sm text-brand-100">الحجوزات والدور والمدفوعات لكل فروعك، بشكل بسيط وواضح.</p>
                    <ul className="mt-10 space-y-4">
                        {FEATURES.map((feature) => (
                            <li key={feature.text} className="flex items-center gap-3">
                                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
                                    <feature.icon className="h-[18px] w-[18px]" />
                                </span>
                                <span className="text-sm text-brand-50">{feature.text}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default Login;
