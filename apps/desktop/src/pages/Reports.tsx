import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

type LowStockItem = { id: string; name: string; stockQty: number; minQty: number };

type SummaryToday = {
  receiptCount: number;
  receiptTotal: number;
  saleCount: number;
  saleTotal: number;
  expenseCount?: number;
  expenseTotal?: number;
};

type SummaryStock = {
  stockValue: number;
  lowStock: LowStockItem[];
};

type SummaryResponse = {
  today: SummaryToday;
  stock: SummaryStock;
};

type DayPoint = {
  date: string;
  receiptsTotal: number;
  salesTotal: number;
  expensesTotal: number;
};

type CustomerRank = {
  customerId: string | null;
  name: string;
  phone: string | null;
  totalSales: number;
  saleCount: number;
  lastSaleAt: string | null;
};

type RangeSummaryResponse = {
  from: string;
  to: string;
  totals: {
    receiptsTotal: number;
    receiptsCount: number;
    salesTotal: number;
    salesCount: number;
    expensesTotal?: number;
    expensesCount?: number;
  };
  customerSummary: {
    regularSalesTotal: number;
    regularSalesCount: number;
    loyalSalesTotal: number;
    loyalSalesCount: number;
    loyalCustomersCount: number;
  };
  customerRanking: CustomerRank[];
  days: DayPoint[];
};

type TopProduct = {
  productId: string;
  name: string;
  unit: string;
  qty: number;
  revenue: number;
};

type TopProductsResponse = {
  from: string;
  to: string;
  items: TopProduct[];
};

function fmt(n: number) {
  return Number(n || 0).toLocaleString("uz-UZ");
}

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function clampDateStr(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  return s;
}

export default function Reports() {
  const todayStr = useMemo(() => isoDate(new Date()), []);
  const defaultFrom = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return isoDate(d);
  }, []);

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(todayStr);

  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [range, setRange] = useState<RangeSummaryResponse | null>(null);
  const [top, setTop] = useState<TopProductsResponse | null>(null);

  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingRange, setLoadingRange] = useState(false);
  const [loadingTop, setLoadingTop] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [sparkDays, setSparkDays] = useState<7 | 14 | 30 | 60>(7);
  const [sparkMode, setSparkMode] = useState<"ALL" | "ONLY_SALES" | "ONLY_RECEIPTS" | "NON_ZERO">("NON_ZERO");

  async function fetchSummary() {
    setLoadingSummary(true);
    setError(null);
    try {
      const res = await api.get("/api/reports/summary");
      setSummary(res.data as SummaryResponse);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Hisobotlarni olishda xatolik");
    } finally {
      setLoadingSummary(false);
    }
  }

  async function fetchRangeAndTop(nextFrom?: string, nextTo?: string) {
    const f = clampDateStr(nextFrom ?? from);
    const t = clampDateStr(nextTo ?? to);

    if (!f || !t) {
      setError("Sana formati noto'g'ri (YYYY-MM-DD).");
      return;
    }
    if (f > t) {
      setError("From sanasi To sanasidan katta bo'lishi mumkin emas.");
      return;
    }

    setError(null);

    setLoadingRange(true);
    try {
      const res = await api.get(`/api/reports/summary-range?from=${encodeURIComponent(f)}&to=${encodeURIComponent(t)}`);
      setRange(res.data as RangeSummaryResponse);
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || "Range hisobotni olishda xatolik";
      setError(msg);
      setRange(null);
    } finally {
      setLoadingRange(false);
    }

    setLoadingTop(true);
    try {
      const res = await api.get(`/api/reports/top-products?from=${encodeURIComponent(f)}&to=${encodeURIComponent(t)}&limit=8`);
      setTop(res.data as TopProductsResponse);
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || "Top mahsulotlarni olishda xatolik";
      setError(msg);
      setTop(null);
    } finally {
      setLoadingTop(false);
    }
  }

  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchRangeAndTop(from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rangeTotals = range?.totals;

  const sparkDaysList = useMemo(() => {
    const days = range?.days ?? [];
    if (!days.length) return [];

    const sliced = days.slice(-sparkDays);

    if (sparkMode === "ALL") return sliced;
    if (sparkMode === "ONLY_SALES") return sliced.filter((d) => (d.salesTotal ?? 0) > 0);
    if (sparkMode === "ONLY_RECEIPTS") return sliced.filter((d) => (d.receiptsTotal ?? 0) > 0);

    return sliced.filter((d) => (d.salesTotal ?? 0) > 0 || (d.receiptsTotal ?? 0) > 0);
  }, [range?.days, sparkDays, sparkMode]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-lg font-semibold text-neutral-900">Hisobotlar</div>
            <div className="mt-1 text-sm text-neutral-600">Sana bo'yicha analiz va mijoz reytinglari</div>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-neutral-600">From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-neutral-600">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
              />
            </div>

            <button
              onClick={() => fetchRangeAndTop(from, to)}
              className="rounded-2xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
              disabled={loadingRange || loadingTop}
            >
              {loadingRange || loadingTop ? "Yuklanmoqda..." : "Filterni qo'llash"}
            </button>

            <button
              onClick={() => {
                fetchSummary();
                fetchRangeAndTop(from, to);
              }}
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

      <div className="grid gap-4 md:grid-cols-5">
        <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-neutral-600">Bugungi kirim</div>
          <div className="mt-3 text-2xl font-semibold text-neutral-900">
            {loadingSummary || !summary ? "-" : fmt(summary.today.receiptTotal)}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            {loadingSummary || !summary ? "" : `${summary.today.receiptCount} ta qabul`}
          </div>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-neutral-600">Bugungi sotuv</div>
          <div className="mt-3 text-2xl font-semibold text-neutral-900">
            {loadingSummary || !summary ? "-" : fmt(summary.today.saleTotal)}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            {loadingSummary || !summary ? "" : `${summary.today.saleCount} ta sotuv`}
          </div>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-neutral-600">Bugungi xarajat</div>
          <div className="mt-3 text-2xl font-semibold text-neutral-900">
            {loadingSummary || !summary ? "-" : fmt(summary.today.expenseTotal ?? 0)}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            {loadingSummary || !summary ? "" : `${summary.today.expenseCount ?? 0} ta xarajat`}
          </div>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-neutral-600">Ombor qiymati</div>
          <div className="mt-3 text-2xl font-semibold text-neutral-900">
            {loadingSummary || !summary ? "-" : fmt(summary.stock.stockValue)}
          </div>
          <div className="mt-1 text-xs text-neutral-500">Tannarx bo'yicha</div>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-neutral-600">Kam qolganlar</div>
          <div className="mt-3 text-2xl font-semibold text-neutral-900">
            {loadingSummary || !summary ? "-" : summary.stock.lowStock.length}
          </div>
          <div className="mt-1 text-xs text-neutral-500">Min qoldiqdan past</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-neutral-900">Sana bo'yicha umumiy</div>
              <div className="mt-1 text-xs text-neutral-500">
                {from} - {to}
              </div>
            </div>
            <div className="text-xs text-neutral-500">{loadingRange ? "Yuklanmoqda..." : range ? "Tayyor" : "-"}</div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-neutral-200 p-4">
              <div className="text-xs font-semibold text-neutral-600">Kirim</div>
              <div className="mt-2 text-xl font-semibold text-neutral-900">
                {!rangeTotals ? "-" : fmt(rangeTotals.receiptsTotal)}
              </div>
              <div className="mt-1 text-xs text-neutral-500">{!rangeTotals ? "" : `${rangeTotals.receiptsCount} ta`}</div>
            </div>

            <div className="rounded-2xl border border-neutral-200 p-4">
              <div className="text-xs font-semibold text-neutral-600">Sotuv</div>
              <div className="mt-2 text-xl font-semibold text-neutral-900">
                {!rangeTotals ? "-" : fmt(rangeTotals.salesTotal)}
              </div>
              <div className="mt-1 text-xs text-neutral-500">{!rangeTotals ? "" : `${rangeTotals.salesCount} ta`}</div>
            </div>

            <div className="rounded-2xl border border-neutral-200 p-4">
              <div className="text-xs font-semibold text-neutral-600">Xarajat</div>
              <div className="mt-2 text-xl font-semibold text-neutral-900">
                {!rangeTotals ? "-" : fmt(rangeTotals.expensesTotal ?? 0)}
              </div>
              <div className="mt-1 text-xs text-neutral-500">{!rangeTotals ? "" : `${rangeTotals.expensesCount ?? 0} ta`}</div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-neutral-200 p-4">
            <div className="text-xs font-semibold text-neutral-600">Net (Sotuv - Kirim - Xarajat)</div>
            <div className="mt-2 text-2xl font-semibold text-neutral-900">
              {!rangeTotals ? "-" : fmt((rangeTotals.salesTotal ?? 0) - (rangeTotals.receiptsTotal ?? 0) - (rangeTotals.expensesTotal ?? 0))}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-neutral-900">Mijozlar bo'yicha summalar</div>
          <div className="mt-1 text-xs text-neutral-500">Oddiy va sodiq mijozlar taqqoslanadi</div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-neutral-200 p-4">
              <div className="text-xs font-semibold text-neutral-600">Oddiy mijozlar</div>
              <div className="mt-2 text-xl font-semibold text-neutral-900">
                {!range ? "-" : fmt(range.customerSummary.regularSalesTotal)}
              </div>
              <div className="mt-1 text-xs text-neutral-500">
                {!range ? "" : `${range.customerSummary.regularSalesCount} ta sotuv`}
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 p-4">
              <div className="text-xs font-semibold text-neutral-600">Sodiq mijozlar</div>
              <div className="mt-2 text-xl font-semibold text-neutral-900">
                {!range ? "-" : fmt(range.customerSummary.loyalSalesTotal)}
              </div>
              <div className="mt-1 text-xs text-neutral-500">
                {!range ? "" : `${range.customerSummary.loyalSalesCount} ta sotuv`}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-neutral-200 p-4">
            <div className="text-xs font-semibold text-neutral-600">Sodiq mijozlar soni</div>
            <div className="mt-2 text-2xl font-semibold text-neutral-900">
              {!range ? "-" : range.customerSummary.loyalCustomersCount}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-neutral-900">Mijoz reytingi</div>
            <div className="mt-1 text-xs text-neutral-500">Sodiq mijozlar bo'yicha umumiy sotuv summasi</div>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200">
          <div className="grid grid-cols-12 bg-neutral-50 px-4 py-2 text-xs font-semibold text-neutral-600">
            <div className="col-span-1">#</div>
            <div className="col-span-5">Mijoz</div>
            <div className="col-span-2 text-right">Sotuvlar</div>
            <div className="col-span-4 text-right">Umumiy summa</div>
          </div>

          {!range || range.customerRanking.length === 0 ? (
            <div className="p-4 text-sm text-neutral-500">Reyting uchun ma'lumot yo'q</div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {range.customerRanking.map((item, index) => (
                <div key={`${item.customerId ?? "unknown"}-${index}`} className="grid grid-cols-12 px-4 py-3 text-sm">
                  <div className="col-span-1 font-semibold text-neutral-700">{index + 1}</div>
                  <div className="col-span-5">
                    <div className="font-semibold text-neutral-900">{item.name}</div>
                    <div className="mt-1 text-xs text-neutral-500">{item.phone || "Telefon yo'q"}</div>
                  </div>
                  <div className="col-span-2 text-right text-neutral-800">{item.saleCount}</div>
                  <div className="col-span-4 text-right font-semibold text-neutral-900">{fmt(item.totalSales)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-neutral-900">Kunlik mini-grafik</div>
            <div className="mt-1 text-xs text-neutral-500">Oxirgi kunlar bo'yicha kirim/sotuv</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sparkDays}
              onChange={(e) => setSparkDays(Number(e.target.value) as 7 | 14 | 30 | 60)}
              className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
            >
              <option value={7}>Oxirgi 7 kun</option>
              <option value={14}>Oxirgi 14 kun</option>
              <option value={30}>Oxirgi 30 kun</option>
              <option value={60}>Oxirgi 60 kun</option>
            </select>

            <select
              value={sparkMode}
              onChange={(e) => setSparkMode(e.target.value as "ALL" | "ONLY_SALES" | "ONLY_RECEIPTS" | "NON_ZERO")}
              className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
            >
              <option value="NON_ZERO">Faqat aktiv kunlar</option>
              <option value="ALL">Hamma kun</option>
              <option value="ONLY_SALES">Faqat sotuv bor</option>
              <option value="ONLY_RECEIPTS">Faqat kirim bor</option>
            </select>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {loadingRange ? (
            <div className="text-sm text-neutral-500">Yuklanmoqda...</div>
          ) : !range || !range.days || range.days.length === 0 ? (
            <div className="text-sm text-neutral-500">Ma'lumot yo'q</div>
          ) : sparkDaysList.length === 0 ? (
            <div className="text-sm text-neutral-500">Filter bo'yicha yozuv topilmadi</div>
          ) : (
            (() => {
              const max = Math.max(...sparkDaysList.map((x) => Math.max(x.salesTotal ?? 0, x.receiptsTotal ?? 0, 1)));

              return sparkDaysList
                .slice()
                .reverse()
                .map((d) => {
                  const saleW = Math.round(((d.salesTotal ?? 0) / max) * 100);
                  const recW = Math.round(((d.receiptsTotal ?? 0) / max) * 100);

                  return (
                    <div key={d.date} className="rounded-2xl border border-neutral-200 p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-neutral-700">{d.date}</div>
                        <div className="text-xs text-neutral-500">
                          Kirim: {fmt(d.receiptsTotal)} | Sotuv: {fmt(d.salesTotal)}
                        </div>
                      </div>

                      <div className="mt-2 space-y-2">
                        <div>
                          <div className="mb-1 text-[11px] font-semibold text-neutral-500">Kirim</div>
                          <div className="h-2 w-full rounded-full bg-neutral-100">
                            <div className="h-2 rounded-full bg-neutral-900" style={{ width: `${recW}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="mb-1 text-[11px] font-semibold text-neutral-500">Sotuv</div>
                          <div className="h-2 w-full rounded-full bg-neutral-100">
                            <div className="h-2 rounded-full bg-neutral-700" style={{ width: `${saleW}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                });
            })()
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-neutral-900">Top mahsulotlar</div>
            <div className="mt-1 text-xs text-neutral-500">
                {from} - {to} (eng ko'p sotilgan)
            </div>
          </div>
          <div className="text-xs text-neutral-500">{loadingTop ? "Yuklanmoqda..." : ""}</div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200">
          <div className="grid grid-cols-12 bg-neutral-50 px-4 py-2 text-xs font-semibold text-neutral-600">
            <div className="col-span-6">Mahsulot</div>
            <div className="col-span-2 text-right">Miqdor</div>
            <div className="col-span-2 text-right">Summa</div>
            <div className="col-span-2 text-right">O'rtacha</div>
          </div>

          {loadingTop ? (
            <div className="p-4 text-sm text-neutral-500">Yuklanmoqda...</div>
          ) : !top || !top.items || top.items.length === 0 ? (
            <div className="p-4 text-sm text-neutral-500">Ma'lumot yo'q</div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {top.items.map((p) => {
                const avg = p.qty > 0 ? p.revenue / p.qty : 0;
                return (
                  <div key={p.productId} className="grid grid-cols-12 px-4 py-3 text-sm">
                    <div className="col-span-6">
                      <div className="font-semibold text-neutral-900">{p.name}</div>
                      <div className="mt-1 text-xs text-neutral-500">{p.unit}</div>
                    </div>
                    <div className="col-span-2 text-right text-neutral-800">{fmt(p.qty)}</div>
                    <div className="col-span-2 text-right font-semibold text-neutral-900">{fmt(p.revenue)}</div>
                    <div className="col-span-2 text-right text-neutral-700">{fmt(avg)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold text-neutral-900">Kam qolgan mahsulotlar</div>
        <div className="mt-3 space-y-2">
          {loadingSummary ? (
            <div className="text-sm text-neutral-500">Yuklanmoqda...</div>
          ) : !summary || summary.stock.lowStock.length === 0 ? (
            <div className="text-sm text-neutral-500">Hammasi joyida</div>
          ) : (
            summary.stock.lowStock.map((p) => (
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

