import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { ProductSelect } from "../components/ProductSelect";

type Product = {
  id: string;
  name: string;
  unit: string;
  salePrice: number;
  loyalSalePrice: number;
  stockQty: number;
};

type Customer = {
  id: string;
  name: string;
  phone: string | null;
};

type CustomerType = "REGULAR" | "LOYAL";

type Row = { productId: string; qty: string };

type SaleResponse = {
  sale: {
    id: string;
    createdAt: string;
    total: number;
    customerType: CustomerType;
    customer: string | null;
    customerRef?: { id: string; name: string } | null;
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
  return Number(n || 0).toLocaleString("uz-UZ");
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildReceiptHtml(receipt: SaleResponse["sale"]) {
  const created = new Date(receipt.createdAt).toLocaleString("uz-UZ");
  const customerText = receipt.customerType === "LOYAL"
    ? `Sodiq: ${receipt.customerRef?.name || receipt.customer || "-"}`
    : "Oddiy mijoz";

  const rows = receipt.items
    .map((it) => {
      const line = Number(it.lineTotal || 0).toLocaleString("uz-UZ");
      const price = Number(it.price || 0).toLocaleString("uz-UZ");
      const name = escapeHtml(it.product.name);
      const unit = escapeHtml(it.product.unit);

      return `
        <div class="row">
          <div class="row-name">${name}</div>
          <div class="row-meta">
            <span>${it.qty} ${unit} x ${price}</span>
            <span class="row-total">${line}</span>
          </div>
        </div>
      `;
    })
    .join("");

  const totalString = Number(receipt.total || 0).toLocaleString("uz-UZ");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Chek</title>
  <style>
    @page { margin: 0; }
    body {
      margin: 0;
      padding: 0 4mm;
      font-family: 'Courier New', Courier, monospace;
      font-size: 13px;
      line-height: 1.2;
      color: #000;
      background: #fff;
    }
    .container { width: 100%; max-width: 80mm; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 4mm; padding-top: 4mm; }
    .title { font-size: 20px; font-weight: bold; margin: 0; }
    .subtitle { font-size: 12px; margin-top: 2px; }
    .divider { border-bottom: 1px dashed #000; margin: 3mm 0; }
    .row { margin-bottom: 3mm; }
    .row-name { font-weight: bold; }
    .row-meta { display: flex; justify-content: space-between; font-size: 12px; margin-top: 1px; }
    .row-total { font-weight: bold; }
    .total-section { display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; margin-top: 5mm; }
    .footer { text-align: center; font-size: 11px; margin-top: 8mm; padding-bottom: 5mm; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">OptomApp</h1>
      <div class="subtitle">Sotuv Cheki</div>
    </div>

    <div class="subtitle">ID: #${receipt.id.slice(0, 8)}</div>
    <div class="subtitle">Sana: ${created}</div>
    <div class="subtitle">Mijoz: ${escapeHtml(customerText)}</div>

    <div class="divider"></div>

    <div class="items">
      ${rows}
    </div>

    <div class="divider"></div>

    <div class="total-section">
      <span>Jami:</span>
      <span>${totalString}</span>
    </div>

    <div class="footer">
      Xaridingiz uchun rahmat!
    </div>
  </div>
</body>
</html>`;
}

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
    alert("Print oynasini ochib bo'lmadi.");
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  await new Promise((r) => setTimeout(r, 150));

  iframe.contentWindow.focus();
  iframe.contentWindow.print();

  setTimeout(() => {
    try {
      document.body.removeChild(iframe);
    } catch {
      // ignore
    }
  }, 800);
}

export default function Sales() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rows, setRows] = useState<Row[]>([{ productId: "", qty: "1" }]);

  const [customerType, setCustomerType] = useState<CustomerType>("REGULAR");
  const [loyalCustomerId, setLoyalCustomerId] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [receipt, setReceipt] = useState<SaleResponse["sale"] | null>(null);

  function priceFor(productId: string) {
    const p = products.find((x) => x.id === productId);
    if (!p) return 0;
    return customerType === "LOYAL" ? Number(p.loyalSalePrice ?? p.salePrice ?? 0) : Number(p.salePrice ?? 0);
  }

  async function fetchProducts() {
    setLoading(true);
    setError(null);
    try {
      const [{ data: productData }, { data: customerData }] = await Promise.all([
        api.get("/api/products"),
        api.get("/api/customers"),
      ]);

      setProducts((productData?.items ?? []) as Product[]);
      setCustomers((customerData?.items ?? []) as Customer[]);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Ma'lumotlarni olishda xatolik");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (customerType === "REGULAR") {
      setLoyalCustomerId("");
    }
  }, [customerType]);

  const subtotal = useMemo(() => {
    return rows.reduce((s, r) => s + Number(r.qty || 0) * priceFor(r.productId), 0);
  }, [rows, products, customerType]);

  function addRow() {
    setRows((p) => [...p, { productId: "", qty: "1" }]);
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
        }));

      if (items.length === 0) {
        setError("Kamida bitta mahsulot tanlang");
        setSaving(false);
        return;
      }

      for (const it of items) {
        if (!(it.qty > 0)) throw new Error("Miqdor > 0 bo'lishi kerak");
      }

      if (customerType === "LOYAL" && !loyalCustomerId) {
        throw new Error("Sodiq mijoz tanlang");
      }

      const { data } = await api.post("/api/sales", {
        customerType,
        customerId: customerType === "LOYAL" ? loyalCustomerId : null,
        items,
      });

      const sale = (data as SaleResponse).sale;

      setReceipt(sale);
      setRows([{ productId: "", qty: "1" }]);
      setCustomerType("REGULAR");
      setLoyalCustomerId("");

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
              Mijoz turiga qarab narx avtomatik hisoblanadi
            </div>
          </div>

          <div className="text-sm text-neutral-700">
            Jami: <span className="font-semibold text-neutral-900">{fmt(subtotal)}</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div>
            <label className="text-xs font-semibold text-neutral-600">Mijoz turi</label>
            <select
              value={customerType}
              onChange={(e) => setCustomerType(e.target.value as CustomerType)}
              className="mt-1 w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
            >
              <option value="REGULAR">Oddiy mijoz</option>
              <option value="LOYAL">Sodiq mijoz</option>
            </select>
          </div>

          {customerType === "LOYAL" ? (
            <div>
              <label className="text-xs font-semibold text-neutral-600">Sodiq mijoz</label>
              <select
                value={loyalCustomerId}
                onChange={(e) => setLoyalCustomerId(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
              >
                <option value="">Mijozni tanlang</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
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
                const rowPrice = priceFor(r.productId);
                return (
                  <tr key={i}>
                    <td className="px-4 py-3">
                      <ProductSelect
                        products={products}
                        value={r.productId}
                        onChange={(pid) => {
                          setRow(i, {
                            productId: pid,
                          });
                        }}
                        disabled={loading}
                      />
                    </td>

                    <td className="px-4 py-3 text-neutral-700">{p ? p.stockQty : "-"}</td>

                    <td className="px-4 py-3">
                      <input
                        value={r.qty}
                        onFocus={(e) => {
                          if (e.target.value === "0") setRow(i, { qty: "" });
                        }}
                        onBlur={(e) => {
                          if (e.target.value === "") setRow(i, { qty: "0" });
                        }}
                        onChange={(e) => setRow(i, { qty: e.target.value })}
                        className="w-28 rounded-2xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                      />
                    </td>

                    <td className="px-4 py-3 text-neutral-900">{fmt(rowPrice)}</td>

                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => removeRow(i)}
                        disabled={rows.length === 1}
                        className="rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-50"
                      >
                        O'chirish
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
            + Qator qo'shish
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

      {receipt && (
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-base font-semibold text-neutral-900">Chek</div>
              <div className="mt-1 text-xs text-neutral-500">
                #{receipt.id.slice(0, 8)} | {new Date(receipt.createdAt).toLocaleString("uz-UZ")}
              </div>
              <div className="mt-1 text-xs text-neutral-600">
                {receipt.customerType === "LOYAL"
                  ? `Sodiq: ${receipt.customerRef?.name || receipt.customer || "-"}`
                  : "Oddiy mijoz"}
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
              NOMI | MIQDOR | NARX | SUMMA
            </div>

            <div className="divide-y divide-neutral-100">
              {receipt.items.map((it) => (
                <div key={it.id} className="px-4 py-3 text-sm">
                  <div className="font-semibold text-neutral-900">{it.product.name}</div>
                  <div className="mt-1 flex items-center justify-between text-neutral-700">
                    <div>
                      {it.qty} {it.product.unit} x {fmt(it.price)}
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
