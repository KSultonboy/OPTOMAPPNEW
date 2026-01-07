import { NavLink } from "react-router-dom";
import {
    LayoutDashboard,
    PackagePlus,
    Boxes,
    ShoppingCart,
    Settings as SettingsIcon,
    History as HistoryIcon,
} from "lucide-react";

const linkBase =
    "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition";
const linkActive = "bg-neutral-900 text-white";
const linkInactive = "text-neutral-700 hover:bg-neutral-100";

function Item({
    to,
    icon: Icon,
    label,
}: {
    to: string;
    icon: any;
    label: string;
}) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : linkInactive}`
            }
            end
        >
            <Icon size={18} />
            <span>{label}</span>
        </NavLink>
    );
}

export default function Sidebar() {
    return (
        <aside className="flex h-full w-64 flex-col border-r border-neutral-200 bg-white px-3 py-4">
            <div className="flex items-center gap-3 px-2 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-900 text-white">
                    <span className="text-sm font-semibold">OA</span>
                </div>
                <div className="leading-tight">
                    <div className="text-sm font-semibold text-neutral-900">OptomApp</div>
                    <div className="text-xs text-neutral-500">Wholesale Desktop</div>
                </div>
            </div>

            <nav className="flex flex-col gap-1">
                <Item to="/reports" icon={LayoutDashboard} label="Hisobotlar" />
                <Item to="/receive" icon={PackagePlus} label="Qabul" />
                <Item to="/inventory" icon={Boxes} label="Ombor" />
                <Item to="/sales" icon={ShoppingCart} label="Sotuv" />
                <Item to="/history" icon={HistoryIcon} label="History" />
                <Item to="/settings" icon={SettingsIcon} label="Sozlamalar" />
            </nav>

            <div className="mt-auto px-2 pt-6 text-xs text-neutral-400">v0.1 • Minimal UI</div>
        </aside>
    );
}
