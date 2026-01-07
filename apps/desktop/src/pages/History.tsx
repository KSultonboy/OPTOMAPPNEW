import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

type HistoryItem = {
    type: "SALE" | "RECEIPT";
    id: string;
    createdAt: string;
    total: number;
    paymentMethod?: string;
    items: { name: string; unit: string; qty: number; price: number; lineTotal: number }[];
};

function fmt(n: number) {
    return Number(n || 0).toFixed(2);
}

export default function History() {
    const [items, setItems] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [type, setType] = useState<"ALL" | "SALE" | "RECEIPT">("ALL");

    async function fetchHistory() {
        setLoading(true);
        setError(null);
        try {
            const { data } = await api.get("/api/reports/history?limit=80");
            setItems((data?.items ?? []) as HistoryItem[]);
        } catch (e: any) {
            setError(e?.response?.data?.error || e?.message || "History olishda xatolik");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchHistory();
    }, []);

    const filtered = useMemo(() => {
        if (type === "ALL") return items;
        return items.filter((x) => x.type === type);
    }, [items, type]);

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="text-lg font-semibold text-neutral-900">History</div>
                        <div className="mt-1 text-sm text-neutral-600">Oxirgi qabul va sotuvlar tarixi</div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value as any)}
                            className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
                        >
                            <option value="ALL">Hammasi</option>
                            <option value="RECEIPT">Qabul</option>
                            <option value="SALE">Sotuv</option>
                        </select>

                        <button
                            onClick={fetchHistory}
                            className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-neutral-50"
                        >
                            Yangilash
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}
            </div>

            <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
                <div className="px-4 py-3 text-sm font-semibold text-neutral-900 border-b border-neutral-200">
                    {loading ? "Yuklanmoqda..." : `${filtered.length} ta yozuv`}
                </div>

                <div className="divide-y divide-neutral-100">
                    {!loading && filtered.length === 0 ? (
                        <div className="p-6 text-sm text-neutral-500">Hozircha history yo‘q</div>
                    ) : (
                        filtered.map((h) => (
                            <div key={h.id} className="p-4">
                                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <div className="text-sm font-semibold text-neutral-900">
                                            {h.type === "SALE" ? "Sotuv" : "Qabul"} • #{h.id.slice(0, 8)}
                                        </div>
                                        <div className="mt-1 text-xs text-neutral-500">
                                            {new Date(h.createdAt).toLocaleString()}
                                            {h.type === "SALE" && h.paymentMethod ? ` • ${h.paymentMethod}` : ""}
                                        </div>
                                    </div>

                                    <div className="text-sm font-semibold text-neutral-900">
                                        {fmt(h.total)}
                                    </div>
                                </div>

                                <div className="mt-3 overflow-hidden rounded-2xl border border-neutral-200">
                                    <div className="bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-600">
                                        NOMI • MIQDOR • NARX • SUMMA
                                    </div>
                                    <div className="divide-y divide-neutral-100">
                                        {h.items.slice(0, 6).map((it, idx) => (
                                            <div key={idx} className="px-3 py-2 text-sm">
                                                <div className="font-medium text-neutral-900">{it.name}</div>
                                                <div className="mt-1 flex items-center justify-between text-neutral-700">
                                                    <div>
                                                        {it.qty} {it.unit} × {fmt(it.price)}
                                                    </div>
                                                    <div className="font-semibold text-neutral-900">{fmt(it.lineTotal)}</div>
                                                </div>
                                            </div>
                                        ))}
                                        {h.items.length > 6 && (
                                            <div className="px-3 py-2 text-xs text-neutral-500">
                                                Yana {h.items.length - 6} ta item bor...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
