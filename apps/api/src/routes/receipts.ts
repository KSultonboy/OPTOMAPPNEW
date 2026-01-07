import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

// GET /api/receipts
router.get("/", requireAuth, async (_req, res) => {
  const items = await prisma.receipt.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: { include: { product: true } } },
  });
  res.json({ items });
});

// POST /api/receipts
// body: { note?, items: [{ productId, qty, costPrice }] }
router.post("/", requireAuth, async (req, res) => {
  const note = req.body?.note ? String(req.body.note).trim() : null;
  const items = req.body?.items;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Items required" });
  }

  // validate
  const prepared = items.map((i: any) => ({
    productId: String(i.productId),
    qty: Number(i.qty),
    costPrice: Number(i.costPrice),
  }));

  for (const it of prepared) {
    if (!it.productId) return res.status(400).json({ error: "productId required" });
    if (!(it.qty > 0)) return res.status(400).json({ error: "qty must be > 0" });
    if (Number.isNaN(it.costPrice) || it.costPrice < 0) return res.status(400).json({ error: "invalid costPrice" });
  }

  const totalCost = prepared.reduce((s, it) => s + it.qty * it.costPrice, 0);

  const receipt = await prisma.$transaction(async (tx) => {
    const created = await tx.receipt.create({
      data: {
        note,
        totalCost,
        items: {
          create: prepared.map((it) => ({
            productId: it.productId,
            qty: it.qty,
            costPrice: it.costPrice,
            lineCost: it.qty * it.costPrice,
          })),
        },
      },
      include: { items: true },
    });

    // stock update + movement
    for (const it of created.items) {
      await tx.product.update({
        where: { id: it.productId },
        data: { stockQty: { increment: it.qty }, costPrice: it.costPrice },
      });

      await tx.stockMovement.create({
        data: {
          type: "IN",
          qty: it.qty,
          note: "Receipt (Qabul)",
          productId: it.productId,
          receiptId: created.id,
        },
      });
    }

    return created;
  });

  res.status(201).json({ receipt });
});

export default router;
