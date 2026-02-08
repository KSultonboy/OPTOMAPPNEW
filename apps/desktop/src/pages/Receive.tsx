import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { ProductSelect } from "../components/ProductSelect";

type Product = {
  id: string;
  name: string;
  unit: string;
  costPrice: number;
  salePrice: number;
  stockQty: number;
};

type Row = { productId: string; qty: string; costPrice: string };

function fmt(n: number) {
  return Number(n || 0).toLocaleString("uz-UZ");
}

export default function Receive() {
  const [products, setProducts] = useState<Product[]>([]);
  const [rows, setRows] = useState<Row[]>([{ productId: "", qty: "1", costPrice: "0" }]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchProducts() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/api/products");
      setProducts((data?.items ?? []) as Product[]);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Mahsulotlarni olishda xatolik");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  const totalCost = useMemo(() => {
    return rows.reduce(
      (s, r) => s + Number(r.qty || 0) * Number(r.costPrice || 0),
      0
    );
  }, [rows]);

  function addRow() {
    setRows((p) => [...p, { productId: "", qty: "1", costPrice: "0" }]);
  }

  function removeRow(i: number) {
    setRows((p) => p.filter((_, idx) => idx !== i));
  }

  function setRow(i: number, patch: Partial<Row>) {
    setRows((p) => p.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function onSave() {
    setSaving(true);
    setError(null);

    try {
      const items = rows
        .filter((r) => r.productId)
        .map((r) => ({
          productId: r.productId,
          qty: Number(r.qty),
          costPrice: Number(r.costPrice),
        }));

      if (items.length === 0) {
        setError("Kamida bitta mahsulot tanlang");
        setSaving(false);
        return;
      }

      for (const it of items) {
        if (!(it.qty > 0)) throw new Error("Miqdor > 0 bo‘lishi kerak");
        if (Number.isNaN(it.costPrice) || it.costPrice < 0) throw new Error("Tannarx xato");
      }

      await api.post("/api/receipts", {
        supplier: null,
        note: null,
        items: items.map((it) => ({
          productId: it.productId,
          qty: it.qty,
          costPrice: it.costPrice,
        })),
      });

      setRows([{ productId: "", qty: "1", costPrice: "0" }]);
      await fetchProducts();
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || "Qabul saqlashda xatolik";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-lg font-semibold text-neutral-900">Qabul</div>
            <div className="mt-1 text-sm text-neutral-600">
              Mahsulot tanlansa tannarx avtomatik tushadi
            </div>
          </div>

          <div className="text-sm text-neutral-700">
            Jami xarajat:{" "}
            <span className="font-semibold text-neutral-900">{fmt(totalCost)}</span>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Mahsulot</th>
                <th className="px-4 py-3 text-left font-semibold">Birlik</th>
                <th className="px-4 py-3 text-left font-semibold">Miqdor</th>
                <th className="px-4 py-3 text-left font-semibold">Tannarx</th>
                <th className="px-4 py-3 text-right font-semibold">Amal</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-100">
              {rows.map((r, i) => {
                const p = products.find((x) => x.id === r.productId);
                return (
                  <tr key={i}>
                    <td className="px-4 py-3">
                      <ProductSelect
                        products={products}
                        value={r.productId}
                        onChange={(pid) => {
                          const pp = products.find((x) => x.id === pid);
                          setRow(i, {
                            productId: pid,
                            costPrice: pp ? String(pp.costPrice ?? 0) : r.costPrice,
                          });
                        }}
                        disabled={loading}
                      />
                    </td>

                    <td className="px-4 py-3 text-neutral-700">{p ? p.unit : "—"}</td>

                    <td className="px-4 py-3">
                      <input
                        value={r.qty}
                        onFocus={(e) => { if (e.target.value === "0") setRow(i, { qty: "" }); }}
                        onBlur={(e) => { if (e.target.value === "") setRow(i, { qty: "0" }); }}
                        onChange={(e) => setRow(i, { qty: e.target.value })}
                        className="w-28 rounded-2xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                      />
                    </td>

                    <td className="px-4 py-3">
                      <input
                        value={r.costPrice}
                        onFocus={(e) => { if (e.target.value === "0") setRow(i, { costPrice: "" }); }}
                        onBlur={(e) => { if (e.target.value === "") setRow(i, { costPrice: "0" }); }}
                        onChange={(e) => setRow(i, { costPrice: e.target.value })}
                        className="w-32 rounded-2xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                      />
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => removeRow(i)}
                        disabled={rows.length === 1}
                        className="rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-50"
                      >
                        O‘chirish
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-neutral-200 p-4 md:flex-row md:items-center md:justify-between">
          <button
            onClick={addRow}
            className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-neutral-50"
          >
            + Qator qo‘shish
          </button>

          <button
            onClick={onSave}
            disabled={saving}
            className="rounded-2xl bg-neutral-900 px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
          >
            {saving ? "Saqlanmoqda..." : "Qabulni saqlash"}
          </button>
        </div>
      </div>
    </div>
  );
}
