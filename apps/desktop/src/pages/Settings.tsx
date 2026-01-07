import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../store/auth";

export default function SettingsPage() {
    const { admin, logout, hydrate } = useAuth();

    const [msg, setMsg] = useState<string | null>(null);
    const [err, setErr] = useState<string | null>(null);

    // change password
    const [currentPassword, setCurrentPassword] = useState("");
    const [nextPassword, setNextPassword] = useState("");
    const [changingPass, setChangingPass] = useState(false);

    // change login
    const [nextLogin, setNextLogin] = useState(admin?.login ?? "");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [changingLogin, setChangingLogin] = useState(false);

    useEffect(() => {
        hydrate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function onChangePassword(e: React.FormEvent) {
        e.preventDefault();
        setMsg(null);
        setErr(null);

        setChangingPass(true);
        try {
            await api.post("/api/auth/change-password", { currentPassword, nextPassword });
            setMsg("✅ Parol yangilandi");
            setCurrentPassword("");
            setNextPassword("");
        } catch (e: any) {
            setErr(e?.response?.data?.error || e?.message || "Parolni o‘zgartirish xatosi");
        } finally {
            setChangingPass(false);
        }
    }

    async function onChangeLogin(e: React.FormEvent) {
        e.preventDefault();
        setMsg(null);
        setErr(null);

        setChangingLogin(true);
        try {
            const { data } = await api.post("/api/auth/change-login", {
                currentPassword: confirmPassword,
                nextLogin: nextLogin.trim(),
            });

            // localStorage yangilansin
            localStorage.setItem("optom_admin", JSON.stringify(data.admin));
            hydrate();

            setMsg("✅ Login yangilandi");
            setConfirmPassword("");
        } catch (e: any) {
            setErr(e?.response?.data?.error || e?.message || "Loginni o‘zgartirish xatosi");
        } finally {
            setChangingLogin(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-lg font-semibold text-neutral-900">Settings</div>
                        <div className="text-sm text-neutral-500">
                            Login: <span className="font-medium text-neutral-800">{admin?.login}</span>
                        </div>
                    </div>

                    <button
                        onClick={logout}
                        className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-neutral-50"
                    >
                        Chiqish
                    </button>
                </div>

                {(msg || err) && (
                    <div
                        className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${err
                                ? "border-red-200 bg-red-50 text-red-700"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700"
                            }`}
                    >
                        {err || msg}
                    </div>
                )}
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="text-base font-semibold text-neutral-900">Loginni o‘zgartirish</div>
                <div className="mt-1 text-sm text-neutral-500">
                    Loginni almashtirish uchun hozirgi parolni tasdiqlang
                </div>

                <form onSubmit={onChangeLogin} className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="text-sm font-medium text-neutral-900">Yangi login</label>
                        <input
                            value={nextLogin}
                            onChange={(e) => setNextLogin(e.target.value)}
                            className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
                            placeholder="newadmin"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-neutral-900">Hozirgi parol (tasdiq)</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
                            placeholder="••••••••"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <button
                            type="submit"
                            disabled={changingLogin}
                            className="rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
                        >
                            {changingLogin ? "Saqlanmoqda..." : "Loginni yangilash"}
                        </button>
                    </div>
                </form>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="text-base font-semibold text-neutral-900">Parolni o‘zgartirish</div>
                <div className="mt-1 text-sm text-neutral-500">
                    Avvalgi parol va yangi parolni kiriting
                </div>

                <form onSubmit={onChangePassword} className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="text-sm font-medium text-neutral-900">Hozirgi parol</label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
                            placeholder="••••••••"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-neutral-900">Yangi parol</label>
                        <input
                            type="password"
                            value={nextPassword}
                            onChange={(e) => setNextPassword(e.target.value)}
                            className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
                            placeholder="••••••••"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <button
                            type="submit"
                            disabled={changingPass}
                            className="rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
                        >
                            {changingPass ? "Saqlanmoqda..." : "Parolni yangilash"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
