import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";

export default function Topbar() {
    const nav = useNavigate();
    const { user, logout } = useAuth();

    const initials = useMemo(() => {
        const name = user?.name || "User";
        return name.trim().slice(0, 1).toUpperCase();
    }, [user]);

    return (
        <header className="border-b border-neutral-200 bg-white">
            <div className="flex items-center gap-3 px-6 py-4">
                <div className="text-sm text-neutral-500">Qidiruv (keyin qo‘shamiz)</div>

                <div className="ml-auto flex items-center gap-3">
                    <input
                        placeholder="Search..."
                        className="w-80 rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm outline-none focus:border-neutral-400"
                    />

                    <div className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3 py-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold text-neutral-700">
                            {initials}
                        </div>
                        <div className="text-sm font-semibold text-neutral-900">{user?.name || "User"}</div>
                    </div>

                    <button
                        onClick={() => {
                            logout();
                            nav("/login");
                        }}
                        className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-neutral-50"
                    >
                        Chiqish
                    </button>
                </div>
            </div>
        </header>
    );
}
