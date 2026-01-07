import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

// GET /api/sales
router.get("/", requireAuth, async (_req, res) => {
  const items = await prisma.sale.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: { include: { product: true } } },
  });
  res.json({ items });
});

// POST /api/sales
// body: { items: [{ productId, qty, price }] }
router.post("/", requireAuth, async (req, res) => {
  const items = req.body?.items;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Items required" });
  }

  const prepared = items.map((i: any) => ({
    productId: String(i.productId),
    qty: Number(i.qty),
    price: Number(i.price),
  }));

  for (const it of prepared) {
    if (!it.productId) return res.status(400).json({ error: "productId required" });
    if (!(it.qty > 0)) return res.status(400).json({ error: "qty must be > 0" });
    if (Number.isNaN(it.price) || it.price < 0) return res.status(400).json({ error: "invalid price" });
  }

  const subtotal = prepared.reduce((s, it) => s + it.qty * it.price, 0);
  const total = subtotal;

  const sale = await prisma
    .$transaction(async (tx) => {
      // stock check
      for (const it of prepared) {
        const p = await tx.product.findUnique({ where: { id: it.productId } });
        if (!p) throw Object.assign(new Error("Product not found"), { status: 404 });
        if (p.stockQty < it.qty) {
          throw Object.assign(new Error(`Stock yetarli emas: ${p.name}`), { status: 400 });
        }
      }

      const created = await tx.sale.create({
        data: {
          // customer/payment/discount yo'q
          subtotal,
          total,
          items: {
            create: prepared.map((it) => ({
              productId: it.productId,
              qty: it.qty,
              price: it.price,
              lineTotal: it.qty * it.price,
            })),
          },
        },
        include: {
          items: { include: { product: true } },
        },
      });

      // stock update + movement
      for (const it of created.items) {
        await tx.product.update({
          where: { id: it.productId },
          data: { stockQty: { decrement: it.qty } },
        });

        await tx.stockMovement.create({
          data: {
            type: "OUT",
            qty: it.qty,
            note: "Sale (Sotuv)",
            productId: it.productId,
            saleId: created.id,
          },
        });
      }

      return created;
    })
    .catch((e: any) => {
      const status = e?.status ?? 500;
      return Promise.reject({ status, message: e?.message ?? "Sale error" });
    });

  res.status(201).json({ sale });
});

export default router;
