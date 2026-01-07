import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

// GET /api/products?q=
router.get("/", requireAuth, async (req, res) => {
  const q = String(req.query.q ?? "").trim();

  const items = await prisma.product.findMany({
    where: q
      ? {
        OR: [
          { name: { contains: q} },
          { barcode: { contains: q } },
        ],
      }
      : undefined,
    orderBy: { createdAt: "desc" },
  });

  res.json({ items });
});

// POST /api/products
router.post("/", requireAuth, async (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  const barcode = req.body?.barcode ? String(req.body.barcode).trim() : null;
  const unit = String(req.body?.unit ?? "PCS").trim() || "PCS";
  const costPrice = Number(req.body?.costPrice ?? 0);
  const salePrice = Number(req.body?.salePrice ?? 0);
  const minQty = Number(req.body?.minQty ?? 0);

  if (!name) return res.status(400).json({ error: "Name is required" });
  if (Number.isNaN(costPrice) || Number.isNaN(salePrice) || Number.isNaN(minQty)) {
    return res.status(400).json({ error: "Invalid numbers" });
  }

  const created = await prisma.product.create({
    data: { name, barcode, unit, costPrice, salePrice, minQty },
  });

  res.status(201).json({ item: created });
});

// PUT /api/products/:id
router.put("/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id);

  const exists = await prisma.product.findUnique({ where: { id } });
  if (!exists) return res.status(404).json({ error: "Product not found" });

  const name = req.body?.name !== undefined ? String(req.body.name).trim() : undefined;
  const barcode = req.body?.barcode !== undefined ? (req.body.barcode ? String(req.body.barcode).trim() : null) : undefined;
  const unit = req.body?.unit !== undefined ? String(req.body.unit).trim() : undefined;

  const costPrice = req.body?.costPrice !== undefined ? Number(req.body.costPrice) : undefined;
  const salePrice = req.body?.salePrice !== undefined ? Number(req.body.salePrice) : undefined;
  const minQty = req.body?.minQty !== undefined ? Number(req.body.minQty) : undefined;

  if (name !== undefined && !name) return res.status(400).json({ error: "Name is required" });
  if (costPrice !== undefined && Number.isNaN(costPrice)) return res.status(400).json({ error: "Invalid costPrice" });
  if (salePrice !== undefined && Number.isNaN(salePrice)) return res.status(400).json({ error: "Invalid salePrice" });
  if (minQty !== undefined && Number.isNaN(minQty)) return res.status(400).json({ error: "Invalid minQty" });

  const updated = await prisma.product.update({
    where: { id },
    data: { name, barcode, unit, costPrice, salePrice, minQty },
  });

  res.json({ item: updated });
});

// DELETE /api/products/:id
router.delete("/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id);

  const exists = await prisma.product.findUnique({ where: { id } });
  if (!exists) return res.status(404).json({ error: "Product not found" });

  await prisma.product.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;
