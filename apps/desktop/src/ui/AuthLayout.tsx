// apps/desktop/src/ui/AuthLayout.tsx
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen w-full bg-zinc-50">
            <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4">
                <div className="w-full">
                    <div className="mb-6 text-center">
                        <p className="text-xs font-medium text-zinc-400">
                            Inventory • Sales • Suppliers • Analytics
                        </p>
                    </div>
                    <div className="flex justify-center">{children}</div>
                </div>
            </div>
        </div>
    );
}
