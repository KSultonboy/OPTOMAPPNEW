import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

type Product = {
  id: string;
  name: string;
  unit: string;
  salePrice: number;
  stockQty: number;
};

type Row = { productId: string; qty: string; price: string };

type SaleResponse = {
  sale: {
    id: string;
    createdAt: string;
    total: number;
    items: {
      id: string;
      qty: number;
      price: number;
      lineTotal: number;
      product: { name: string; unit: string };
    }[];
  };
};

function fmt(n: number) {
  return Number(n || 0).toFixed(2);
}

function escapeHtml(s: string) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildReceiptHtml(receipt: SaleResponse["sale"]) {
  const created = new Date(receipt.createdAt).toLocaleString();

  const rows = receipt.items
    .map((it) => {
      const line = Number(it.lineTotal || 0).toFixed(2);
      const price = Number(it.price || 0).toFixed(2);
      const name = escapeHtml(it.product.name);
      const unit = escapeHtml(it.product.unit);

      return `
        <div class="row">
          <div class="name">${name}</div>
          <div class="meta">${it.qty} ${unit} × ${price}</div>
          <div class="line">${line}</div>
        </div>
      `;
    })
    .join("");

  const total = Number(receipt.total || 0).toFixed(2);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Chek</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, sans-serif; color: #111; background: #fff; }
    .paper { width: 320px; margin: 0 auto; padding: 12px; }
    .h1 { font-weight: 700; font-size: 16px; }
    .sub { margin-top: 4px; color: #666; font-size: 12px; }
    .sep { margin: 10px 0; border-top: 1px dashed #ddd; }
    .head { display: flex; justify-content: space-between; font-size: 11px; color: #666; }
    .row { padding: 8px 0; border-bottom: 1px solid #f1f1f1; }
    .name { font-weight: 700; font-size: 13px; }
    .meta { margin-top: 3px; font-size: 12px; color: #444; }
    .line { margin-top: 4px; text-align: right; font-weight: 700; font-size: 13px; }
    .total { display: flex; justify-content: space-between; align-items: center; padding-top: 10px; font-weight: 800; }
    @media print {
      .paper { margin: 0; width: 100%; }
    }
  </style>
</head>
<body>
  <div class="paper">
    <div class="h1">Chek</div>
    <div class="sub">#${escapeHtml(receipt.id.slice(0, 8))} • ${escapeHtml(created)}</div>

    <div class="sep"></div>

    <div class="head">
      <div>NOMI</div>
      <div>SUMMA</div>
    </div>

    <div>${rows}</div>

    <div class="sep"></div>

    <div class="total">
      <div>Umumiy</div>
      <div>${total}</div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * ✅ Tauri-friendly print:
 * - window.open yo'q
 * - popup block bo'lmaydi
 * - iframe srcdoc orqali print
 */
async function printReceiptInline(receipt: SaleResponse["sale"]) {
  const html = buildReceiptHtml(receipt);

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc || !iframe.contentWindow) {
    document.body.removeChild(iframe);
    alert("Print oynasini ochib bo‘lmadi.");
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  // yuklanishini kutib print qilamiz
  await new Promise((r) => setTimeout(r, 150));

  iframe.contentWindow.focus();
  iframe.contentWindow.print();

  // print dialog yopilgach iframe'ni olib tashlaymiz
  setTimeout(() => {
    try {
      document.body.removeChild(iframe);
    } catch { }
  }, 800);
}

export default function Sales() {
  const [products, setProducts] = useState<Product[]>([]);
  const [rows, setRows] = useState<Row[]>([{ productId: "", qty: "1", price: "0" }]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [receipt, setReceipt] = useState<SaleResponse["sale"] | null>(null);

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

  const subtotal = useMemo(() => {
    return rows.reduce((s, r) => s + Number(r.qty || 0) * Number(r.price || 0), 0);
  }, [rows]);

  function addRow() {
    setRows((p) => [...p, { productId: "", qty: "1", price: "0" }]);
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
    setReceipt(null);

    try {
      const items = rows
        .filter((r) => r.productId)
        .map((r) => ({
          productId: r.productId,
          qty: Number(r.qty),
          price: Number(r.price),
        }));

      if (items.length === 0) {
        setError("Kamida bitta mahsulot tanlang");
        setSaving(false);
        return;
      }

      for (const it of items) {
        if (!(it.qty > 0)) throw new Error("Miqdor > 0 bo‘lishi kerak");
        if (Number.isNaN(it.price) || it.price < 0) throw new Error("Narx xato");
      }

      const { data } = await api.post("/api/sales", { items });
      const sale = (data as SaleResponse).sale;

      setReceipt(sale);
      setRows([{ productId: "", qty: "1", price: "0" }]);

      await fetchProducts();
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || "Sotuv saqlashda xatolik";
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
            <div className="text-lg font-semibold text-neutral-900">Sotuv</div>
            <div className="mt-1 text-sm text-neutral-600">
              Mahsulot tanlansa sotuv narxi avtomatik tushadi
            </div>
          </div>

          <div className="text-sm text-neutral-700">
            Jami: <span className="font-semibold text-neutral-900">{fmt(subtotal)}</span>
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
                <th className="px-4 py-3 text-left font-semibold">Qoldiq</th>
                <th className="px-4 py-3 text-left font-semibold">Miqdor</th>
                <th className="px-4 py-3 text-left font-semibold">Narx</th>
                <th className="px-4 py-3 text-right font-semibold">Amal</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-100">
              {rows.map((r, i) => {
                const p = products.find((x) => x.id === r.productId);
                return (
                  <tr key={i}>
                    <td className="px-4 py-3">
                      <select
                        value={r.productId}
                        onChange={(e) => {
                          const pid = e.target.value;
                          const pp = products.find((x) => x.id === pid);

                          setRow(i, {
                            productId: pid,
                            price: pp ? String(pp.salePrice ?? 0) : r.price,
                          });
                        }}
                        className="w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
                        disabled={loading}
                      >
                        <option value="">{loading ? "Yuklanmoqda..." : "Tanlang"}</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.unit})
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-4 py-3 text-neutral-700">{p ? p.stockQty : "—"}</td>

                    <td className="px-4 py-3">
                      <input
                        value={r.qty}
                        onChange={(e) => setRow(i, { qty: e.target.value })}
                        className="w-28 rounded-2xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                      />
                    </td>

                    <td className="px-4 py-3">
                      <input
                        value={r.price}
                        onChange={(e) => setRow(i, { price: e.target.value })}
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
            {saving ? "Saqlanmoqda..." : "Sotuvni saqlash"}
          </button>
        </div>
      </div>

      {/* Chek */}
      {receipt && (
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-base font-semibold text-neutral-900">Chek</div>
              <div className="mt-1 text-xs text-neutral-500">
                #{receipt.id.slice(0, 8)} • {new Date(receipt.createdAt).toLocaleString()}
              </div>
            </div>

            <button
              type="button"
              onClick={() => printReceiptInline(receipt)}
              className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-neutral-50"
            >
              Print
            </button>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200">
            <div className="bg-neutral-50 px-4 py-2 text-xs font-semibold text-neutral-600">
              NOMI • MIQDOR • NARX • SUMMA
            </div>

            <div className="divide-y divide-neutral-100">
              {receipt.items.map((it) => (
                <div key={it.id} className="px-4 py-3 text-sm">
                  <div className="font-semibold text-neutral-900">{it.product.name}</div>
                  <div className="mt-1 flex items-center justify-between text-neutral-700">
                    <div>
                      {it.qty} {it.product.unit} × {fmt(it.price)}
                    </div>
                    <div className="font-semibold text-neutral-900">{fmt(it.lineTotal)}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-neutral-200 bg-white px-4 py-3">
              <div className="text-sm font-semibold text-neutral-900">Umumiy</div>
              <div className="text-sm font-semibold text-neutral-900">{fmt(receipt.total)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
