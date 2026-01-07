import { useEffect, useState } from "react";
import { api } from "../lib/api";

type Product = {
  id: string;
  name: string;
  barcode: string | null;
  unit: string;
  costPrice: number;
  salePrice: number;
  stockQty: number;
  minQty: number;
};

const DEFAULT_UNITS = ["DONA", "KG"];

function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-lg rounded-3xl border border-neutral-200 bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold text-neutral-900">{title}</div>
          <button
            onClick={onClose}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-sm hover:bg-neutral-50"
          >
            Yopish
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export default function Inventory() {
  const [items, setItems] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const [name, setName] = useState("");
  const [unit, setUnit] = useState("DONA");
  const [customUnit, setCustomUnit] = useState("");
  const [costPrice, setCostPrice] = useState("0");
  const [salePrice, setSalePrice] = useState("0");
  const [minQty, setMinQty] = useState("0");

  async function fetchProducts() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/api/products", {
        params: q.trim() ? { q: q.trim() } : undefined,
      });
      setItems((data?.items ?? []) as Product[]);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Omborni olishda xatolik");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchProducts, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function openCreate() {
    setEditing(null);
    setName("");
    setUnit("DONA");
    setCustomUnit("");
    setCostPrice("0");
    setSalePrice("0");
    setMinQty("0");
    setOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setName(p.name ?? "");
    setUnit(DEFAULT_UNITS.includes(p.unit) ? p.unit : "CUSTOM");
    setCustomUnit(DEFAULT_UNITS.includes(p.unit) ? "" : p.unit);
    setCostPrice(String(p.costPrice ?? 0));
    setSalePrice(String(p.salePrice ?? 0));
    setMinQty(String(p.minQty ?? 0));
    setOpen(true);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const finalUnit =
        unit === "CUSTOM" ? customUnit.trim().toUpperCase() : unit;

      const payload = {
        name: name.trim(),
        // barcode yubormaymiz
        unit: finalUnit || "DONA",
        costPrice: Number(costPrice),
        salePrice: Number(salePrice),
        minQty: Number(minQty),
      };

      if (!payload.name) {
        setError("Nomi majburiy");
        setSaving(false);
        return;
      }
      if (!payload.unit) {
        setError("Birlik majburiy");
        setSaving(false);
        return;
      }

      if (editing) await api.put(`/api/products/${editing.id}`, payload);
      else await api.post("/api/products", payload);

      setOpen(false);
      await fetchProducts();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Saqlashda xatolik");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(p: Product) {
    const ok = window.confirm(`O‘chirasizmi? (${p.name})`);
    if (!ok) return;

    setSaving(true);
    setError(null);
    try {
      await api.delete(`/api/products/${p.id}`);
      await fetchProducts();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "O‘chirishda xatolik");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-lg font-semibold text-neutral-900">Ombor</div>
            <div className="mt-1 text-sm text-neutral-600">Mahsulotlar va qoldiq</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchProducts}
              className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-neutral-50"
            >
              Yangilash
            </button>
            <button
              onClick={openCreate}
              className="rounded-2xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              + Mahsulot
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Qidiruv: nom bo‘yicha"
            className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-400"
          />
          <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600">
            Jami: <span className="font-semibold text-neutral-900">{items.length}</span>
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
                <th className="px-4 py-3 text-left font-semibold">Qoldiq</th>
                <th className="px-4 py-3 text-left font-semibold">Tannarx</th>
                <th className="px-4 py-3 text-left font-semibold">Sotuv</th>
                <th className="px-4 py-3 text-right font-semibold">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td className="px-4 py-5 text-neutral-500" colSpan={6}>
                    Yuklanmoqda...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-4 py-5 text-neutral-500" colSpan={6}>
                    Hozircha mahsulot yo‘q
                  </td>
                </tr>
              ) : (
                items.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-neutral-900">{p.name}</div>
                    </td>
                    <td className="px-4 py-3">{p.unit}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${p.stockQty <= p.minQty
                            ? "bg-red-50 text-red-700"
                            : "bg-emerald-50 text-emerald-700"
                          }`}
                      >
                        {p.stockQty}
                      </span>
                    </td>
                    <td className="px-4 py-3">{p.costPrice}</td>
                    <td className="px-4 py-3">{p.salePrice}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(p)}
                          className="rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-sm hover:bg-neutral-50"
                        >
                          Tahrirlash
                        </button>
                        <button
                          onClick={() => onDelete(p)}
                          disabled={saving}
                          className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                          O‘chirish
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={open}
        title={editing ? "Mahsulotni tahrirlash" : "Yangi mahsulot"}
        onClose={() => setOpen(false)}
      >
        <form onSubmit={onSave} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral-900">Nomi *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-neutral-900">Birlik</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-400"
              >
                {DEFAULT_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
                <option value="CUSTOM">Boshqa...</option>
              </select>
            </div>

            {unit === "CUSTOM" && (
              <div>
                <label className="text-sm font-medium text-neutral-900">Custom birlik</label>
                <input
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value)}
                  placeholder="Masalan: LITR"
                  className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
                />
              </div>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-neutral-900">Tannarx</label>
              <input
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-900">Sotuv narxi</label>
              <input
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-900">Min qoldiq</label>
              <input
                value={minQty}
                onChange={(e) => setMinQty(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
          >
            {saving ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
