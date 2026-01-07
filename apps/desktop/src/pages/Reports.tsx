import { useEffect, useState } from "react";
import { api } from "../lib/api";

type Summary = {
    today: {
        receiptCount: number;
        receiptTotal: number;
        saleCount: number;
        saleTotal: number;
    };
    stock: {
        stockValue: number;
        lowStock: { id: string; name: string; stockQty: number; minQty: number }[];
    };
};

export default function Reports() {
    const [data, setData] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function fetchSummary() {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get("/api/reports/summary");
            setData(res.data as Summary);
        } catch (e: any) {
            setError(e?.response?.data?.error || e?.message || "Hisobotlarni olishda xatolik");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchSummary();
    }, []);

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-lg font-semibold text-neutral-900">Hisobotlar</div>
                        <div className="mt-1 text-sm text-neutral-600">Bugungi kirim/chiqim va ombor holati</div>
                    </div>
                    <button
                        onClick={fetchSummary}
                        className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-neutral-50"
                    >
                        Yangilash
                    </button>
                </div>

                {error && (
                    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
                    <div className="text-sm font-medium text-neutral-600">Bugungi kirim</div>
                    <div className="mt-3 text-2xl font-semibold text-neutral-900">
                        {loading || !data ? "—" : data.today.receiptTotal.toFixed(2)}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                        {loading || !data ? "" : `${data.today.receiptCount} ta qabul`}
                    </div>
                </div>

                <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
                    <div className="text-sm font-medium text-neutral-600">Bugungi sotuv</div>
                    <div className="mt-3 text-2xl font-semibold text-neutral-900">
                        {loading || !data ? "—" : data.today.saleTotal.toFixed(2)}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                        {loading || !data ? "" : `${data.today.saleCount} ta sotuv`}
                    </div>
                </div>

                <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
                    <div className="text-sm font-medium text-neutral-600">Ombor qiymati</div>
                    <div className="mt-3 text-2xl font-semibold text-neutral-900">
                        {loading || !data ? "—" : data.stock.stockValue.toFixed(2)}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">Tannarx bo‘yicha</div>
                </div>

                <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
                    <div className="text-sm font-medium text-neutral-600">Kam qolganlar</div>
                    <div className="mt-3 text-2xl font-semibold text-neutral-900">
                        {loading || !data ? "—" : data.stock.lowStock.length}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">Min qoldiqdan past</div>
                </div>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="text-sm font-semibold text-neutral-900">Kam qolgan mahsulotlar</div>
                <div className="mt-3 space-y-2">
                    {loading ? (
                        <div className="text-sm text-neutral-500">Yuklanmoqda...</div>
                    ) : !data || data.stock.lowStock.length === 0 ? (
                        <div className="text-sm text-neutral-500">Hammasi joyida ✅</div>
                    ) : (
                        data.stock.lowStock.map((p) => (
                            <div
                                key={p.id}
                                className="flex items-center justify-between rounded-2xl border border-neutral-200 px-4 py-3 text-sm"
                            >
                                <div className="font-medium text-neutral-900">{p.name}</div>
                                <div className="text-neutral-700">
                                    {p.stockQty} / min {p.minQty}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
