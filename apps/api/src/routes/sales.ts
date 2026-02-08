import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

// GET /api/sales
router.get("/", requireAuth, async (_req, res) => {
  const items = await prisma.sale.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customerRef: { select: { id: true, name: true, phone: true } },
      items: { include: { product: true } },
    },
  });
  res.json({ items });
});

// POST /api/sales
// body: { items: [{ productId, qty }], customerType?: "REGULAR" | "LOYAL", customerId?: string }
router.post("/", requireAuth, async (req, res) => {
  const items = req.body?.items;
  const customerType = String(req.body?.customerType ?? "REGULAR").toUpperCase();
  const customerIdRaw = req.body?.customerId;
  const customerId =
    customerIdRaw === undefined || customerIdRaw === null || String(customerIdRaw).trim() === ""
      ? null
      : String(customerIdRaw).trim();

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Items required" });
  }

  if (customerType !== "REGULAR" && customerType !== "LOYAL") {
    return res.status(400).json({ error: "customerType xato" });
  }
  if (customerType === "LOYAL" && !customerId) {
    return res.status(400).json({ error: "Loyal mijoz tanlanishi kerak" });
  }

  const prepared = items.map((i: any) => ({
    productId: String(i.productId),
    qty: Number(i.qty),
  }));

  for (const it of prepared) {
    if (!it.productId) return res.status(400).json({ error: "productId required" });
    if (!(it.qty > 0)) return res.status(400).json({ error: "qty must be > 0" });
  }

  const sale = await prisma
    .$transaction(async (tx) => {
      const loyalCustomer =
        customerType === "LOYAL" && customerId
          ? await tx.customer.findUnique({ where: { id: customerId } })
          : null;

      if (customerType === "LOYAL" && !loyalCustomer) {
        throw Object.assign(new Error("Sodiq mijoz topilmadi"), { status: 404 });
      }

      const pricedItems: { productId: string; qty: number; price: number }[] = [];

      // stock check
      for (const it of prepared) {
        const p = await tx.product.findUnique({ where: { id: it.productId } });
        if (!p) throw Object.assign(new Error("Product not found"), { status: 404 });
        if (p.stockQty < it.qty) {
          throw Object.assign(new Error(`Stock yetarli emas: ${p.name}`), { status: 400 });
        }

        const unitPrice =
          customerType === "LOYAL"
            ? Number(p.loyalSalePrice ?? p.salePrice ?? 0)
            : Number(p.salePrice ?? 0);

        pricedItems.push({
          productId: it.productId,
          qty: it.qty,
          price: unitPrice,
        });
      }

      const subtotal = pricedItems.reduce((s, it) => s + it.qty * it.price, 0);
      const total = subtotal;

      const created = await tx.sale.create({
        data: {
          customerType: customerType as "REGULAR" | "LOYAL",
          customerId: customerType === "LOYAL" ? customerId : null,
          customer: customerType === "LOYAL" ? loyalCustomer?.name ?? null : "Oddiy mijoz",
          subtotal,
          total,
          items: {
            create: pricedItems.map((it) => ({
              productId: it.productId,
              qty: it.qty,
              price: it.price,
              lineTotal: it.qty * it.price,
            })),
          },
        },
        include: {
          customerRef: { select: { id: true, name: true, phone: true } },
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
