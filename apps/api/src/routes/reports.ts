import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// GET /api/reports/summary
router.get("/summary", requireAuth, async (_req, res) => {
  const from = startOfToday();

  const [todayReceipts, todaySales, products] = await Promise.all([
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
    },
    stock: {
      stockValue,
      lowStock,
    },
  });
});

export default router;
