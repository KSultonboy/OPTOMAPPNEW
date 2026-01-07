import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";

export default function Login() {
  const nav = useNavigate();
  const { login, loading, error, token, hydrate } = useAuth();

  const [loginStr, setLoginStr] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (token) nav("/reports");
  }, [token, nav]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);

    try {
      await login(loginStr.trim(), password);
      nav("/reports");
    } catch (err: any) {
      setLocalError(err?.response?.data?.error || err?.message || "Login xatosi");
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="text-2xl font-semibold text-neutral-900">Kirish</div>
        <div className="mt-2 text-sm text-neutral-600">Login va parolni kiriting</div>

        {(localError || error) && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {localError || error}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral-900">Login</label>
            <input
              value={loginStr}
              onChange={(e) => setLoginStr(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-400"
              placeholder="admin"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-neutral-900">Parol</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-400"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !loginStr.trim() || !password}
            className="mt-2 w-full rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-neutral-800 disabled:opacity-60"
          >
            {loading ? "Kutilmoqda..." : "Kirish"}
          </button>
        </form>
      </div>
    </div>
  );
}
