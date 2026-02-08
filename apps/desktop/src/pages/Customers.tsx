import { useEffect, useState } from "react";
import { api } from "../lib/api";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  note: string | null;
  totalSales?: number;
  saleCount?: number;
  lastSaleAt?: string | null;
  createdAt: string;
};

function fmtMoney(n: number) {
  return Number(n || 0).toLocaleString("uz-UZ");
}

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="w-full max-w-xl rounded-3xl border border-neutral-200 bg-white p-6 shadow-xl">
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

export default function Customers() {
  const [items, setItems] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  async function fetchCustomers() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/api/customers", {
        params: q.trim() ? { q: q.trim() } : undefined,
      });
      setItems((data?.items ?? []) as Customer[]);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Mijozlarni olishda xatolik");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchCustomers, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function openCreate() {
    setEditing(null);
    setName("");
    setPhone("");
    setNote("");
    setOpen(true);
  }

  function openEdit(item: Customer) {
    setEditing(item);
    setName(item.name ?? "");
    setPhone(item.phone ?? "");
    setNote(item.note ?? "");
    setOpen(true);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = name.trim();

    if (!cleanName) {
      setError("Mijoz nomi majburiy");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: cleanName,
        phone: phone.trim() || null,
        note: note.trim() || null,
      };

      if (editing) {
        await api.put(`/api/customers/${editing.id}`, payload);
      } else {
        await api.post("/api/customers", payload);
      }

      setOpen(false);
      await fetchCustomers();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Saqlashda xatolik");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(item: Customer) {
    const ok = window.confirm(`Mijozni o'chirasizmi? (${item.name})`);
    if (!ok) return;

    setSaving(true);
    setError(null);
    try {
      await api.delete(`/api/customers/${item.id}`);
      await fetchCustomers();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "O'chirishda xatolik");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-lg font-semibold text-neutral-900">Mijozlar</div>
            <div className="mt-1 text-sm text-neutral-600">Asosiy mijozlar ro'yxati va statistikasi</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchCustomers}
              className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-neutral-50"
            >
              Yangilash
            </button>
            <button
              onClick={openCreate}
              className="rounded-2xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              + Mijoz
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Qidiruv: ism yoki telefon"
            className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-400"
          />
          <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600">
            Jami mijozlar: <span className="font-semibold text-neutral-900">{items.length}</span>
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
                <th className="px-4 py-3 text-left font-semibold">Mijoz</th>
                <th className="px-4 py-3 text-left font-semibold">Telefon</th>
                <th className="px-4 py-3 text-left font-semibold">Sotuvlar</th>
                <th className="px-4 py-3 text-left font-semibold">Umumiy summa</th>
                <th className="px-4 py-3 text-right font-semibold">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td className="px-4 py-5 text-neutral-500" colSpan={5}>
                    Yuklanmoqda...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-4 py-5 text-neutral-500" colSpan={5}>
                    Hozircha mijoz yo'q
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-neutral-900">{item.name}</div>
                      {item.note ? <div className="mt-1 text-xs text-neutral-500">{item.note}</div> : null}
                    </td>
                    <td className="px-4 py-3 text-neutral-700">{item.phone || "-"}</td>
                    <td className="px-4 py-3">{item.saleCount ?? 0}</td>
                    <td className="px-4 py-3 font-semibold text-neutral-900">{fmtMoney(item.totalSales ?? 0)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(item)}
                          className="rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-sm hover:bg-neutral-50"
                        >
                          Tahrirlash
                        </button>
                        <button
                          onClick={() => onDelete(item)}
                          disabled={saving}
                          className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                          O'chirish
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

      <Modal open={open} title={editing ? "Mijozni tahrirlash" : "Yangi mijoz"} onClose={() => setOpen(false)}>
        <form onSubmit={onSave} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral-900">Mijoz nomi *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-neutral-900">Telefon</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-neutral-900">Izoh</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
            />
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
