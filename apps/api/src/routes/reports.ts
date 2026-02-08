import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

/** ---------- helpers ---------- **/

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmd(s: unknown) {
  if (typeof s !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  // Biz timezone muammosini kamaytirish uchun local startOfDay ishlatamiz:
  const parts = s.split("-").map(Number);
  const local = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
  return local;
}

function startOfToday() {
  return startOfDay(new Date());
}

/** ---------- 1) SUMMARY (old) ---------- **/

// GET /api/reports/summary
router.get("/summary", requireAuth, async (_req, res) => {
  const from = startOfToday();

  const [todayReceipts, todaySales, todayExpenses, products] = await Promise.all([
    prisma.receipt.aggregate({
      where: { createdAt: { gte: from } },
      _sum: { totalCost: true },
      _count: { _all: true },
    }),
    prisma.sale.aggregate({
      where: { createdAt: { gte: from } },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.expense.aggregate({
      where: { createdAt: { gte: from } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.product.findMany({
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, stockQty: true, minQty: true, costPrice: true },
    }),
  ]);

  const stockValue = products.reduce((s, p) => s + (p.stockQty || 0) * (p.costPrice || 0), 0);
  const lowStock = products.filter((p) => p.stockQty <= (p.minQty ?? 0)).slice(0, 8);

  res.json({
    today: {
      receiptCount: todayReceipts._count._all,
      receiptTotal: Number(todayReceipts._sum.totalCost ?? 0),
      saleCount: todaySales._count._all,
      saleTotal: Number(todaySales._sum.total ?? 0),
      expenseCount: todayExpenses._count._all,
      expenseTotal: Number(todayExpenses._sum.amount ?? 0),
    },
    stock: {
      stockValue,
      lowStock,
    },
  });
});

/** ---------- 2) SUMMARY RANGE ---------- **/

// GET /api/reports/summary-range?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/summary-range", requireAuth, async (req, res) => {
  const fromStr = req.query.from;
  const toStr = req.query.to;

  const fromDate = parseYmd(fromStr);
  const toDate = parseYmd(toStr);

  if (!fromDate || !toDate) {
    return res.status(400).json({ error: "from/to required in YYYY-MM-DD format" });
  }
  if (fromDate.getTime() > toDate.getTime()) {
    return res.status(400).json({ error: "from cannot be greater than to" });
  }

  // inclusive range: [fromStart, toEndNextDay)
  const fromStart = startOfDay(fromDate);
  const toStart = startOfDay(toDate);
  const toNext = addDays(toStart, 1);

  // Range limit (performance)
  const daysCount = Math.floor((toStart.getTime() - fromStart.getTime()) / (24 * 3600 * 1000)) + 1;
  if (daysCount > 92) {
    return res.status(400).json({ error: "Range too large (max 92 days)" });
  }

  // totals
  const [
    receiptAgg,
    saleAgg,
    expenseAgg,
    receiptCount,
    saleCount,
    expenseCount,
    regularSalesAgg,
    loyalSalesAgg,
    regularSalesCount,
    loyalSalesCount,
    loyalGrouped,
  ] = await Promise.all([
    prisma.receipt.aggregate({
      where: { createdAt: { gte: fromStart, lt: toNext } },
      _sum: { totalCost: true },
    }),
    prisma.sale.aggregate({
      where: { createdAt: { gte: fromStart, lt: toNext } },
      _sum: { total: true },
    }),
    prisma.expense.aggregate({
      where: { createdAt: { gte: fromStart, lt: toNext } },
      _sum: { amount: true },
    }),
    prisma.receipt.count({ where: { createdAt: { gte: fromStart, lt: toNext } } }),
    prisma.sale.count({ where: { createdAt: { gte: fromStart, lt: toNext } } }),
    prisma.expense.count({ where: { createdAt: { gte: fromStart, lt: toNext } } }),
    prisma.sale.aggregate({
      where: {
        createdAt: { gte: fromStart, lt: toNext },
        customerType: "REGULAR",
      },
      _sum: { total: true },
    }),
    prisma.sale.aggregate({
      where: {
        createdAt: { gte: fromStart, lt: toNext },
        customerType: "LOYAL",
      },
      _sum: { total: true },
    }),
    prisma.sale.count({
      where: {
        createdAt: { gte: fromStart, lt: toNext },
        customerType: "REGULAR",
      },
    }),
    prisma.sale.count({
      where: {
        createdAt: { gte: fromStart, lt: toNext },
        customerType: "LOYAL",
      },
    }),
    prisma.sale.groupBy({
      by: ["customerId"],
      where: {
        createdAt: { gte: fromStart, lt: toNext },
        customerType: "LOYAL",
        customerId: { not: null },
      },
      _sum: { total: true },
      _count: { _all: true },
      _max: { createdAt: true },
    }),
  ]);

  const loyalCustomerIds = loyalGrouped
    .map((g) => g.customerId)
    .filter((x): x is string => Boolean(x));
  const loyalCustomers = loyalCustomerIds.length
    ? await prisma.customer.findMany({
      where: { id: { in: loyalCustomerIds } },
      select: { id: true, name: true, phone: true },
    })
    : [];

  const loyalCustomerMap = new Map(loyalCustomers.map((c) => [c.id, c]));
  const customerRanking = loyalGrouped
    .map((g) => ({
      customerId: g.customerId,
      name: loyalCustomerMap.get(g.customerId ?? "")?.name ?? "Noma'lum mijoz",
      phone: loyalCustomerMap.get(g.customerId ?? "")?.phone ?? null,
      totalSales: Number(g._sum.total ?? 0),
      saleCount: Number(g._count._all ?? 0),
      lastSaleAt: g._max.createdAt ? g._max.createdAt.toISOString() : null,
    }))
    .sort((a, b) => b.totalSales - a.totalSales);

  // daily mini list
  const days: { date: string; receiptsTotal: number; salesTotal: number; expensesTotal: number }[] = [];

  for (let i = 0; i < daysCount; i++) {
    const d0 = addDays(fromStart, i);
    const d1 = addDays(d0, 1);

    const [r, s, e] = await Promise.all([
      prisma.receipt.aggregate({
        where: { createdAt: { gte: d0, lt: d1 } },
        _sum: { totalCost: true },
      }),
      prisma.sale.aggregate({
        where: { createdAt: { gte: d0, lt: d1 } },
        _sum: { total: true },
      }),
      prisma.expense.aggregate({
        where: { createdAt: { gte: d0, lt: d1 } },
        _sum: { amount: true },
      }),
    ]);

    days.push({
      date: toISODate(d0),
      receiptsTotal: Number(r._sum.totalCost ?? 0),
      salesTotal: Number(s._sum.total ?? 0),
      expensesTotal: Number(e._sum.amount ?? 0),
    });
  }

  return res.json({
    from: toISODate(fromStart),
    to: toISODate(toStart),
    totals: {
      receiptsTotal: Number(receiptAgg._sum.totalCost ?? 0),
      receiptsCount: receiptCount,
      salesTotal: Number(saleAgg._sum.total ?? 0),
      salesCount: saleCount,
      expensesTotal: Number(expenseAgg._sum.amount ?? 0),
      expensesCount: expenseCount,
    },
    customerSummary: {
      regularSalesTotal: Number(regularSalesAgg._sum.total ?? 0),
      regularSalesCount,
      loyalSalesTotal: Number(loyalSalesAgg._sum.total ?? 0),
      loyalSalesCount,
      loyalCustomersCount: customerRanking.length,
    },
    customerRanking,
    days,
  });
});

/** ---------- 3) TOP PRODUCTS ---------- **/

// GET /api/reports/top-products?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=8
router.get("/top-products", requireAuth, async (req, res) => {
  const fromStr = req.query.from;
  const toStr = req.query.to;

  const fromDate = parseYmd(fromStr);
  const toDate = parseYmd(toStr);

  if (!fromDate || !toDate) {
    return res.status(400).json({ error: "from/to required in YYYY-MM-DD format" });
  }
  if (fromDate.getTime() > toDate.getTime()) {
    return res.status(400).json({ error: "from cannot be greater than to" });
  }

  const limitRaw = Number(req.query.limit ?? 8);
  const limit = Math.max(1, Math.min(limitRaw, 50));

  const fromStart = startOfDay(fromDate);
  const toStart = startOfDay(toDate);
  const toNext = addDays(toStart, 1);

  // group sale items by productId inside date range
  const grouped = await prisma.saleItem.groupBy({
    by: ["productId"],
    where: {
      sale: { createdAt: { gte: fromStart, lt: toNext } },
    },
    _sum: {
      qty: true,
      lineTotal: true,
    },
  });

  // sort by qty desc, then revenue desc
  grouped.sort((a, b) => {
    const aq = Number(a._sum.qty ?? 0);
    const bq = Number(b._sum.qty ?? 0);
    if (bq !== aq) return bq - aq;
    const ar = Number(a._sum.lineTotal ?? 0);
    const br = Number(b._sum.lineTotal ?? 0);
    return br - ar;
  });

  const topIds = grouped.slice(0, limit).map((g) => g.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: topIds } },
    select: { id: true, name: true, unit: true },
  });

  const map = new Map(products.map((p) => [p.id, p]));

  const items = grouped.slice(0, limit).map((g) => {
    const p = map.get(g.productId);
    return {
      productId: g.productId,
      name: p?.name ?? "Unknown",
      unit: p?.unit ?? "DONA",
      qty: Number(g._sum.qty ?? 0),
      revenue: Number(g._sum.lineTotal ?? 0),
    };
  });

  return res.json({
    from: toISODate(fromStart),
    to: toISODate(toStart),
    items,
  });
});

export default router;
