import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

// GET /api/expense-categories
router.get("/", requireAuth, async (_req, res) => {
  const items = await prisma.expenseCategory.findMany({ orderBy: { name: "asc" } });
  res.json({ items });
});

// POST /api/expense-categories { name }
router.post("/", requireAuth, async (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  if (!name) return res.status(400).json({ error: "name required" });

  try {
    const item = await prisma.expenseCategory.create({ data: { name } });
    res.status(201).json({ item });
  } catch (e: any) {
    const msg = e?.message || "Create failed";
    res.status(400).json({ error: msg });
  }
});

// DELETE /api/expense-categories/:id
router.delete("/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id);
  try {
    await prisma.expenseCategory.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message || "Delete failed";
    res.status(400).json({ error: msg });
  }
});

export default router;
