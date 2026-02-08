import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

type HistoryType = "SALE" | "RECEIPT" | "EXPENSE";

type HistoryItemRow = {
    productId: string;
    name: string;
    unit: string;
    qty: number;
    price: number;     // SALE uchun price (o‘zgarmaydi), RECEIPT uchun costPrice (o‘zgaradi)
    lineTotal: number;
};

type HistoryItem = {
    type: HistoryType;
    id: string;
    createdAt: string;
    total: number;
    paymentMethod?: string;
    note?: string | null;
    items: HistoryItemRow[];
};

type ProductLite = {
    id: string;
    name: string;
    unit: string;
    salePrice?: number;
    costPrice?: number;
};

function fmt(n: number) {
    return Number(n || 0).toFixed(2);
}

function toInputDate(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function parseDateSafe(s: string) {
    const t = Date.parse(s);
    return Number.isNaN(t) ? null : new Date(t);
}

export default function History() {
    const [items, setItems] = useState<HistoryItem[]>([]);
    const [products, setProducts] = useState<ProductLite[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [type, setType] = useState<"ALL" | HistoryType>("ALL");

    // Filters
    const [fromDate, setFromDate] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return toInputDate(d);
    });
    const [toDate, setToDate] = useState<string>(() => toInputDate(new Date()));
    const [productQuery, setProductQuery] = useState("");

    // Edit Modal (items)
    const [editOpen, setEditOpen] = useState(false);
    const [selected, setSelected] = useState<HistoryItem | null>(null);
    const [draftRows, setDraftRows] = useState<
        { productId: string; qty: number; price: number }[]
    >([]);
    const [saving, setSaving] = useState(false);

    // API paths
    const HISTORY_LIST_URL = "/api/history?limit=120";
    const HISTORY_ITEMS_URL = (t: HistoryType, id: string) => `/api/history/${t}/${id}/items`;
    const HISTORY_DELETE_URL = (t: HistoryType, id: string) => `/api/history/${t}/${id}`;
    const PRODUCTS_URL = "/api/products";

    async function fetchHistory() {
        setLoading(true);
        setError(null);
        try {
            const { data } = await api.get(HISTORY_LIST_URL);
            setItems((data?.items ?? []) as HistoryItem[]);
        } catch (e: any) {
            setError(e?.response?.data?.error || e?.message || "History olishda xatolik");
        } finally {
            setLoading(false);
        }
    }

    async function fetchProducts() {
        try {
            const { data } = await api.get(PRODUCTS_URL);
            // products.ts odatda { items } qaytaradi deb olamiz
            setProducts((data?.items ?? []) as ProductLite[]);
        } catch {
            // products bo‘lmasa, dropdown bo‘sh qoladi
        }
    }

    useEffect(() => {
        fetchHistory();
        fetchProducts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filtered = useMemo(() => {
        const q = productQuery.trim().toLowerCase();
        const from = fromDate ? new Date(fromDate + "T00:00:00") : null;
        const to = toDate ? new Date(toDate + "T23:59:59") : null;

        return items.filter((x) => {
            if (type !== "ALL" && x.type !== type) return false;

            const d = parseDateSafe(x.createdAt);
            if (from && d && d < from) return false;
            if (to && d && d > to) return false;

            if (q) {
                const hit = (x.items ?? []).some((it) => (it.name ?? "").toLowerCase().includes(q));
                if (!hit) return false;
            }
            return true;
        });
    }, [items, type, fromDate, toDate, productQuery]);

    function openEdit(h: HistoryItem) {
        setSelected(h);
        setEditOpen(true);

        // draft: productId + qty + price (RECEIPTda o‘zgaradi, SALEda saqlanib qoladi)
        setDraftRows(
            (h.items ?? []).map((it) => ({
                productId: it.productId,
                qty: Number(it.qty ?? 0),
                price: Number(it.price ?? 0),
            }))
        );
    }

    function closeEdit() {
        setEditOpen(false);
        setSelected(null);
        setDraftRows([]);
        setError(null);
    }

    function rowProductName(pid: string) {
        const p = products.find((x) => x.id === pid);
        return p?.name ?? "—";
    }

    function rowUnit(pid: string) {
        const p = products.find((x) => x.id === pid);
        return p?.unit ?? "DONA";
    }

    async function onDelete(h: HistoryItem) {
        const ok = confirm(`${h.type === "SALE" ? "Sotuv" : "Qabul"} #${h.id.slice(0, 8)} ni o‘chiraymi?`);
        if (!ok) return;

        setError(null);
        try {
            await api.delete(HISTORY_DELETE_URL(h.type, h.id));
            setItems((prev) => prev.filter((x) => x.id !== h.id));
        } catch (e: any) {
            setError(e?.response?.data?.error || e?.message || "O‘chirishda xatolik");
        }
    }

    async function onSaveItems() {
        if (!selected) return;

        // basic validate
        if (draftRows.length === 0) {
            setError("Kamida 1 ta item bo‘lishi kerak");
            return;
        }
        for (const r of draftRows) {
            if (!r.productId) return setError("Mahsulot tanlang");
            if (!(r.qty > 0)) return setError("Miqdor 0 dan katta bo‘lsin");
            if (selected.type === "RECEIPT" && (Number.isNaN(r.price) || r.price < 0)) return setError("Qiymat (costPrice) noto‘g‘ri");
        }

        setSaving(true);
        setError(null);
        try {
            if (selected.type === "SALE") {
                // SALE: faqat productId+qty o‘zgarsin, price’ni o‘zimiz saqlab yuboramiz
                await api.put(HISTORY_ITEMS_URL("SALE", selected.id), {
                    items: draftRows.map((r) => ({
                        productId: r.productId,
                        qty: Number(r.qty),
                        price: Number(r.price), // sale.ts talab qiladi (narxni o‘zgartirmaymiz, lekin yuboramiz)
                    })),
                });
            } else {
                // RECEIPT: productId+qty+costPrice o‘zgarsin
                await api.put(HISTORY_ITEMS_URL("RECEIPT", selected.id), {
                    items: draftRows.map((r) => ({
                        productId: r.productId,
                        qty: Number(r.qty),
                        costPrice: Number(r.price), // backend receipt edit costPrice kutadi
                    })),
                });
            }

            closeEdit();
            await fetchHistory();
        } catch (e: any) {
            setError(e?.response?.data?.error || e?.message || "Saqlashda xatolik");
        } finally {
            setSaving(false);
        }
    }

    // UI helpers
    const showCostPrice = selected?.type === "RECEIPT";

    return (
        <div className="space-y-6">
            {/* Header / Filters */}
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
                            <option value="EXPENSE">Xarajat</option>
                        </select>

                        <div className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3 py-2">
                            <span className="text-xs text-neutral-500">Dan:</span>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="text-sm outline-none"
                            />
                        </div>

                        <div className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3 py-2">
                            <span className="text-xs text-neutral-500">Gacha:</span>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="text-sm outline-none"
                            />
                        </div>

                        <input
                            value={productQuery}
                            onChange={(e) => setProductQuery(e.target.value)}
                            placeholder="Mahsulot bo‘yicha qidirish..."
                            className="w-full max-w-xs rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm outline-none focus:border-neutral-400"
                        />

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

            {/* List */}
            <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
                <div className="px-4 py-3 text-sm font-semibold text-neutral-900 border-b border-neutral-200">
                    {loading ? "Yuklanmoqda..." : `${filtered.length} ta yozuv`}
                </div>

                <div className="p-4">
                    {!loading && filtered.length === 0 ? (
                        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-500">
                            Hozircha history yo‘q
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {filtered.map((h) => (
                                <div
                                    key={h.id}
                                    className={[
                                        "rounded-3xl border bg-white p-4 shadow-sm",
                                        h.type === "SALE" ? "border-emerald-200" : "border-sky-200",
                                    ].join(" ")}
                                >
                                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={[
                                                        "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold border",
                                                        h.type === "SALE"
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                            : h.type === "EXPENSE"
                                                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                                                : "bg-sky-50 text-sky-700 border-sky-200",
                                                    ].join(" ")}
                                                >
                                                    {h.type === "SALE" ? "Sotuv" : h.type === "EXPENSE" ? "Xarajat" : "Qabul"}
                                                </span>

                                                <div className="text-sm font-semibold text-neutral-900 truncate">
                                                    #{h.id.slice(0, 8)}
                                                </div>
                                            </div>

                                            <div className="mt-1 text-xs text-neutral-500">
                                                {new Date(h.createdAt).toLocaleString()}
                                                {h.type === "SALE" && h.paymentMethod ? ` • ${h.paymentMethod}` : ""}
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-2">
                                            <div className="text-sm font-semibold text-neutral-900">{fmt(h.total)}</div>
                                            <div className="flex items-center gap-2">
                                                {h.type !== "EXPENSE" && (
                                                    <button
                                                        onClick={() => openEdit(h)}
                                                        className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-neutral-50"
                                                    >
                                                        Edit items
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => onDelete(h)}
                                                    className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200">
                                        <div className="bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-600">
                                            NOMI • MIQDOR • {h.type === "RECEIPT" ? "QIYMAT" : "NARX"} • SUMMA
                                        </div>
                                        <div className="divide-y divide-neutral-100">
                                            {(h.items ?? []).slice(0, 6).map((it, idx) => (
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
                                            {(h.items ?? []).length > 6 && (
                                                <div className="px-3 py-2 text-xs text-neutral-500">
                                                    Yana {(h.items ?? []).length - 6} ta item bor...
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Items Modal */}
            {editOpen && selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-3xl rounded-3xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
                            <div>
                                <div className="text-sm font-semibold text-neutral-900">
                                    {selected.type === "SALE" ? "Sotuv" : "Qabul"} • #{selected.id.slice(0, 8)}
                                </div>
                                <div className="mt-1 text-xs text-neutral-500">{new Date(selected.createdAt).toLocaleString()}</div>
                            </div>

                            <button
                                onClick={closeEdit}
                                className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-neutral-50"
                            >
                                Yopish
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-4">
                            <div className="text-sm font-semibold text-neutral-900">Itemlarni o‘zgartirish</div>

                            <div className="overflow-hidden rounded-2xl border border-neutral-200">
                                <div className="grid grid-cols-12 gap-2 bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-600">
                                    <div className="col-span-6">Mahsulot</div>
                                    <div className="col-span-3">Miqdor</div>
                                    <div className="col-span-2">{showCostPrice ? "Qiymat" : "Narx"}</div>
                                    <div className="col-span-1 text-right">—</div>
                                </div>

                                <div className="divide-y divide-neutral-100">
                                    {draftRows.map((r, idx) => (
                                        <div key={idx} className="grid grid-cols-12 gap-2 px-3 py-2 items-center">
                                            {/* product */}
                                            <div className="col-span-6">
                                                <select
                                                    value={r.productId}
                                                    onChange={(e) => {
                                                        const productId = e.target.value;
                                                        setDraftRows((prev) =>
                                                            prev.map((x, i) => (i === idx ? { ...x, productId } : x))
                                                        );
                                                    }}
                                                    className="w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
                                                >
                                                    <option value="">Mahsulot tanlang</option>
                                                    {products.map((p) => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.name} ({p.unit})
                                                        </option>
                                                    ))}
                                                </select>

                                                {/* fallback display */}
                                                {!products.length && (
                                                    <div className="mt-1 text-xs text-neutral-500">
                                                        Mahsulotlar kelmadi. /api/products GET tekshiring.
                                                        Hozirgi: {rowProductName(r.productId)} ({rowUnit(r.productId)})
                                                    </div>
                                                )}
                                            </div>

                                            {/* qty */}
                                            <div className="col-span-3">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={r.qty}
                                                    onChange={(e) => {
                                                        const qty = Number(e.target.value);
                                                        setDraftRows((prev) =>
                                                            prev.map((x, i) => (i === idx ? { ...x, qty } : x))
                                                        );
                                                    }}
                                                    className="w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
                                                />
                                            </div>

                                            {/* price/costPrice */}
                                            <div className="col-span-2">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={r.price}
                                                    disabled={selected.type === "SALE"} // SALEda narx o‘zgarmaydi
                                                    onChange={(e) => {
                                                        const price = Number(e.target.value);
                                                        setDraftRows((prev) =>
                                                            prev.map((x, i) => (i === idx ? { ...x, price } : x))
                                                        );
                                                    }}
                                                    className={[
                                                        "w-full rounded-2xl border bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400",
                                                        selected.type === "SALE" ? "opacity-60" : "border-neutral-200",
                                                    ].join(" ")}
                                                />
                                            </div>

                                            {/* remove */}
                                            <div className="col-span-1 text-right">
                                                <button
                                                    onClick={() => setDraftRows((prev) => prev.filter((_, i) => i !== idx))}
                                                    className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-neutral-50"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={() =>
                                    setDraftRows((prev) => [
                                        ...prev,
                                        { productId: "", qty: 1, price: selected.type === "RECEIPT" ? 0 : 0 },
                                    ])
                                }
                                className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-neutral-50"
                            >
                                + Item qo‘shish
                            </button>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    onClick={closeEdit}
                                    className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-neutral-50"
                                    disabled={saving}
                                >
                                    Bekor
                                </button>
                                <button
                                    onClick={onSaveItems}
                                    className="rounded-2xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
                                    disabled={saving}
                                >
                                    {saving ? "Saqlanmoqda..." : "Saqlash"}
                                </button>
                            </div>

                            <div className="text-xs text-neutral-500">
                                SALE’da faqat mahsulot va miqdor o‘zgaradi (narx o‘zgarmaydi).
                                RECEIPT’da mahsulot + miqdor + qiymat (costPrice) o‘zgaradi.
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
