import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

// GET /api/customers?q=...
router.get("/", requireAuth, async (req, res) => {
  const q = String(req.query?.q ?? "").trim();

  const where = q
    ? {
        OR: [
          { name: { contains: q } },
          { phone: { contains: q } },
        ],
      }
    : undefined;

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  if (customers.length === 0) {
    return res.json({ items: [] });
  }

  const grouped = await prisma.sale.groupBy({
    by: ["customerId"],
    where: {
      customerType: "LOYAL",
      customerId: { in: customers.map((c) => c.id) },
    },
    _sum: { total: true },
    _count: { _all: true },
    _max: { createdAt: true },
  });

  const totalsMap = new Map(
    grouped
      .filter((g) => g.customerId)
      .map((g) => [
        g.customerId as string,
        {
          totalSales: Number(g._sum.total ?? 0),
          saleCount: Number(g._count._all ?? 0),
          lastSaleAt: g._max.createdAt ? g._max.createdAt.toISOString() : null,
        },
      ])
  );

  return res.json({
    items: customers.map((c) => {
      const totals = totalsMap.get(c.id);
      return {
        ...c,
        totalSales: totals?.totalSales ?? 0,
        saleCount: totals?.saleCount ?? 0,
        lastSaleAt: totals?.lastSaleAt ?? null,
      };
    }),
  });
});

// POST /api/customers { name, phone?, note? }
router.post("/", requireAuth, async (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  const phone = req.body?.phone !== undefined ? String(req.body.phone).trim() : undefined;
  const note = req.body?.note !== undefined ? String(req.body.note).trim() : undefined;

  if (!name) {
    return res.status(400).json({ error: "name required" });
  }

  try {
    const item = await prisma.customer.create({
      data: {
        name,
        ...(phone ? { phone } : {}),
        ...(note ? { note } : {}),
      },
    });

    return res.status(201).json({ item });
  } catch (e: any) {
    return res.status(400).json({ error: e?.message ?? "Customer yaratishda xatolik" });
  }
});

// PUT /api/customers/:id { name?, phone?, note? }
router.put("/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id);

  const name = req.body?.name !== undefined ? String(req.body.name).trim() : undefined;
  const phone = req.body?.phone !== undefined ? String(req.body.phone).trim() : undefined;
  const note = req.body?.note !== undefined ? String(req.body.note).trim() : undefined;

  if (name !== undefined && !name) {
    return res.status(400).json({ error: "name cannot be empty" });
  }

  try {
    const item = await prisma.customer.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(phone !== undefined ? { phone: phone || null } : {}),
        ...(note !== undefined ? { note: note || null } : {}),
      },
    });

    return res.json({ item });
  } catch (e: any) {
    return res.status(400).json({ error: e?.message ?? "Customer update xatolik" });
  }
});

// DELETE /api/customers/:id
router.delete("/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id);

  try {
    await prisma.customer.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(400).json({ error: e?.message ?? "Customer delete xatolik" });
  }
});

export default router;
