import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

type Category = {
  id: string;
  name: string;
};

type Expense = {
  id: string;
  name: string;
  amount: number;
  note?: string | null;
  categoryId?: string | null;
  category?: Category | null;
  createdAt: string;
};

function fmt(n: number) {
  return Number(n || 0).toLocaleString("uz-UZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Expenses() {
  const [items, setItems] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [catLoading, setCatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form
  const [name, setName] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Category management
  const [newCatName, setNewCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);

  async function fetchCategories() {
    setCatLoading(true);
    try {
      const { data } = await api.get("/api/expense-categories");
      setCategories((data?.items ?? []) as Category[]);
    } catch (e: any) {
      console.error("Kategoriyalarni olishda xato", e);
    } finally {
      setCatLoading(false);
    }
  }

  async function fetchExpenses() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/api/expenses?limit=120");
      setItems((data?.items ?? []) as Expense[]);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Xarajatlarni olishda xatolik");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
  }, []);

  async function onAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setAddingCat(true);
    try {
      await api.post("/api/expense-categories", { name: newCatName.trim() });
      setNewCatName("");
      await fetchCategories();
    } catch (e: any) {
      setError(e?.response?.data?.error || "Kategoriya qo'shishda xato");
    } finally {
      setAddingCat(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nm = name.trim();
    if (!nm) {
      setError("Nomi talab qilinadi");
      return;
    }
    const val = Number(amount);
    if (!(val > 0)) {
      setError("Summani to'g'ri kiriting");
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const payload = {
        name: nm,
        amount: val,
        note: note.trim() || undefined,
        categoryId: categoryId || undefined
      };
      if (editingId) {
        await api.patch(`/api/expenses/${editingId}`, payload);
      } else {
        await api.post("/api/expenses", payload);
      }
      setName("");
      setAmount("");
      setNote("");
      setCategoryId("");
      setEditingId(null);
      await fetchExpenses();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Saqlashda xatolik");
    } finally {
      setCreating(false);
    }
  }

  function onStartEdit(x: Expense) {
    setEditingId(x.id);
    setName(x.name || "");
    setAmount(String(x.amount ?? ""));
    setNote(x.note || "");
    setCategoryId(x.categoryId || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onCancelEdit() {
    setEditingId(null);
    setName("");
    setAmount("");
    setNote("");
    setCategoryId("");
    setError(null);
  }

  async function onDelete(id: string) {
    const ok = confirm("Xarajatni o'chiraymi?");
    if (!ok) return;
    try {
      await api.delete(`/api/expenses/${id}`);
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "O'chirishda xatolik");
    }
  }

  const totalToday = useMemo(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    return items
      .filter((x) => {
        const d = new Date(x.createdAt);
        return d >= start;
      })
      .reduce((s, x) => s + (x.amount || 0), 0);
  }, [items]);

  return (
    <div className="space-y-6 pb-12">
      <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-lg font-semibold text-neutral-900">Xarajatlar</div>
            <div className="mt-1 text-sm text-neutral-600">Xarajat kiritish va boshqarish</div>
          </div>

          <div className="rounded-2xl bg-neutral-50 px-4 py-2 text-sm text-neutral-600 border border-neutral-100">
            Bugun: <span className="font-bold text-neutral-900">{fmt(totalToday)} UZS</span>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 font-bold">×</button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Category management */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-neutral-900 mb-4">Kategoriyalar</h3>
            <form onSubmit={onAddCategory} className="flex gap-2 mb-4">
              <input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Yangi kategoriya..."
                className="flex-1 rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
              />
              <button
                type="submit"
                disabled={addingCat || !newCatName.trim()}
                className="rounded-2xl bg-neutral-900 px-3 py-2 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                +
              </button>
            </form>
            <div className="max-h-60 overflow-auto divide-y divide-neutral-100">
              {catLoading ? (
                <div className="py-2 text-xs text-neutral-400">Yuklanmoqda...</div>
              ) : categories.length === 0 ? (
                <div className="py-2 text-xs text-neutral-400 italic">Kategoriyalar yo'q</div>
              ) : (
                categories.map(c => (
                  <div key={c.id} className="py-2 text-sm text-neutral-700 flex justify-between items-center">
                    <span>{c.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="lg:col-span-2">
          <form onSubmit={onSubmit} className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-neutral-600">Xarajat nomi</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-neutral-400"
                  placeholder="Masalan: Ijara to'lovi, Transport..."
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-600">Summa (UZS)</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-neutral-400 font-semibold"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-600">Kategoriya</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-neutral-400"
                >
                  <option value="">Tanlanmagan</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-neutral-600">Izoh (ixtiyoriy)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-neutral-400"
                  placeholder="Qo'shimcha tafsilotlar..."
                  rows={2}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              {editingId && (
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="rounded-2xl border border-neutral-200 bg-white px-6 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  Bekor qilish
                </button>
              )}
              <button
                type="submit"
                className="rounded-2xl bg-neutral-900 px-8 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60 transition-colors"
                disabled={creating}
              >
                {creating ? "Saqlanmoqda..." : editingId ? "Yangilash" : "Saqlash"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <div className="px-6 py-4 text-sm font-semibold text-neutral-900 border-b border-neutral-200 flex justify-between items-center">
          <span>Oxirgi xarajatlar</span>
          <span className="text-xs font-normal text-neutral-500">{items.length} ta yozuv</span>
        </div>

        <div className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-sm text-neutral-500">Yuklanmoqda...</div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-sm text-neutral-500">
              Hozircha xarajatlar mavjud emas
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 text-xs font-semibold text-neutral-600 border-b border-neutral-100">
                  <th className="px-6 py-3">Nomi / Izoh</th>
                  <th className="px-6 py-3">Kategoriya</th>
                  <th className="px-6 py-3">Sana</th>
                  <th className="px-6 py-3 text-right">Summa</th>
                  <th className="px-6 py-3 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {items.map((x) => (
                  <tr key={x.id} className="hover:bg-neutral-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-neutral-900">{x.name}</div>
                      {x.note && <div className="text-xs text-neutral-500 mt-0.5">{x.note}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">
                        {x.category?.name || "Kategoriya yo'q"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-neutral-500">
                      {new Date(x.createdAt).toLocaleString("uz-UZ", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-bold text-neutral-900">{fmt(x.amount)}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onStartEdit(x)}
                          className="p-2 rounded-xl text-neutral-600 hover:bg-neutral-100 transition-colors"
                          title="Tahrirlash"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button
                          onClick={() => onDelete(x.id)}
                          className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
                          title="O'chirish"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
