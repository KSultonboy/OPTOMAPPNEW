import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

// GET /api/expenses?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=
router.get("/", requireAuth, async (req, res) => {
  const limitRaw = Number(req.query.limit ?? 100);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 100;

  const fromStr = typeof req.query.from === "string" ? req.query.from : undefined;
  const toStr = typeof req.query.to === "string" ? req.query.to : undefined;

  const where: any = {};

  if (fromStr) {
    const d = new Date(fromStr + "T00:00:00");
    if (!Number.isNaN(d.getTime())) where.createdAt = { ...(where.createdAt || {}), gte: d };
  }
  if (toStr) {
    const d = new Date(toStr + "T23:59:59");
    if (!Number.isNaN(d.getTime())) where.createdAt = { ...(where.createdAt || {}), lte: d };
  }

  const items = await prisma.expense.findMany({
    where,
    include: { category: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  res.json({ items });
});

// POST /api/expenses { name, amount, note?, categoryId? }
router.post("/", requireAuth, async (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  const amount = Number(req.body?.amount);
  const note = req.body?.note !== undefined ? String(req.body.note).trim() : undefined;
  const categoryId = req.body?.categoryId !== undefined ? String(req.body.categoryId) : undefined;

  if (!name) {
    return res.status(400).json({ error: "name required" });
  }
  if (!(amount > 0) || Number.isNaN(amount)) {
    return res.status(400).json({ error: "amount > 0 bo'lsin" });
  }

  const created = await prisma.expense.create({
    data: {
      name,
      amount,
      ...(note !== undefined ? { note } : {}),
      ...(categoryId !== undefined ? { categoryId } : {}),
    },
    include: { category: true },
  });

  res.status(201).json({ item: created });
});

// DELETE /api/expenses/:id
router.delete("/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id);
  await prisma.expense.delete({ where: { id } }).catch((e: any) => {
    const msg = e?.message || "Delete failed";
    return res.status(400).json({ error: msg });
  });
  return res.json({ ok: true });
});

// PATCH /api/expenses/:id { name?, amount?, note?, categoryId? }
router.patch("/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id);
  const name = req.body?.name !== undefined ? String(req.body.name).trim() : undefined;
  const amount = req.body?.amount !== undefined ? Number(req.body.amount) : undefined;
  const note = req.body?.note !== undefined ? String(req.body.note).trim() : undefined;
  const categoryId = req.body?.categoryId !== undefined ? String(req.body.categoryId) : undefined;

  if (name !== undefined && !name) return res.status(400).json({ error: "name cannot be empty" });
  if (amount !== undefined && (!(amount > 0) || Number.isNaN(amount))) return res.status(400).json({ error: "invalid amount" });

  try {
    const item = await prisma.expense.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(amount !== undefined ? { amount } : {}),
        ...(note !== undefined ? { note } : {}),
        ...(categoryId !== undefined ? { categoryId } : {}),
      },
      include: { category: true },
    });
    return res.json({ item });
  } catch (e: any) {
    const msg = e?.message || "Update failed";
    return res.status(400).json({ error: msg });
  }
});

export default router;
