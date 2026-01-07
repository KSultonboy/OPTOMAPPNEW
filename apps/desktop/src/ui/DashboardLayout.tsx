import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function DashboardLayout() {
    return (
        <div className="flex h-screen bg-neutral-50">
            <Sidebar />
            <div className="flex flex-1 flex-col">
                <Topbar />
                <main className="flex-1 overflow-auto p-6">
                    <div className="mx-auto w-full max-w-6xl">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
