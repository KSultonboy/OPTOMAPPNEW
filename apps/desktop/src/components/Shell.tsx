import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../store/auth";

function Item({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        "block rounded-xl px-3 py-2 text-sm " +
        (isActive ? "bg-black text-white" : "text-gray-700 hover:bg-gray-100")
      }
    >
      {label}
    </NavLink>
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="h-screen w-screen bg-gray-50">
      <div className="mx-auto grid h-full max-w-[1400px] grid-cols-[260px_1fr] gap-4 p-4">
        <aside className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-4">
            <div className="text-lg font-semibold">OptomApp</div>
            <div className="text-xs text-gray-500">{user?.name} • {user?.role}</div>
          </div>

          <div className="space-y-2">
            <Item to="/sales" label="Sotuv (POS)" />
            <Item to="/receive" label="Qabul (Kirim)" />
            <Item to="/inventory" label="Ombor" />
            <Item to="/reports" label="Hisobot" />
          </div>

          <button
            className="mt-6 w-full rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
            onClick={logout}
          >
            Chiqish
          </button>

          <div className="mt-4 text-xs text-gray-400">
            Desktop .exe (Tauri)
          </div>
        </aside>

        <main className="rounded-2xl bg-white p-4 shadow-sm overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
