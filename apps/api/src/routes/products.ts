import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

/**
 * GET /api/products?q=...
 */
router.get("/", requireAuth, async (req, res) => {
  const q = String(req.query?.q ?? "").trim();

  const where = q
    ? {
      OR: [
        { name: { contains: q } },
        { barcode: { contains: q } },
      ],
    }
    : undefined;

  const items = await prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  res.json({ items });
});

/**
 * GET /api/products/:id
 */
router.get("/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id);

  const item = await prisma.product.findUnique({ where: { id } });
  if (!item) return res.status(404).json({ error: "Product topilmadi" });

  res.json({ item });
});

/**
 * POST /api/products
 * body: { name, unit?, costPrice?, salePrice?, stockQty?, minQty?, barcode? }
 * barcode bizda optional (front umuman yubormasa ham bo'ladi)
 */
router.post("/", requireAuth, async (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  const unit = String(req.body?.unit ?? "DONA").trim() || "DONA";

  const barcodeRaw = req.body?.barcode;
  const barcode =
    barcodeRaw === null || barcodeRaw === undefined || String(barcodeRaw).trim() === ""
      ? null
      : String(barcodeRaw).trim();

  const costPrice = Number(req.body?.costPrice ?? 0);
  const salePrice = Number(req.body?.salePrice ?? 0);
  const stockQty = Number(req.body?.stockQty ?? 0);
  const minQty = Number(req.body?.minQty ?? 0);

  if (!name) return res.status(400).json({ error: "name majburiy" });
  if (Number.isNaN(costPrice) || costPrice < 0) return res.status(400).json({ error: "costPrice xato" });
  if (Number.isNaN(salePrice) || salePrice < 0) return res.status(400).json({ error: "salePrice xato" });
  if (Number.isNaN(stockQty) || stockQty < 0) return res.status(400).json({ error: "stockQty xato" });
  if (Number.isNaN(minQty) || minQty < 0) return res.status(400).json({ error: "minQty xato" });

  try {
    const item = await prisma.product.create({
      data: {
        name,
        unit,
        barcode,
        costPrice,
        salePrice,
        stockQty,
        minQty,
      },
    });

    res.status(201).json({ item });
  } catch (e: any) {
    // unique barcode bo'lsa error bo'lishi mumkin
    const msg = e?.message || "Product yaratishda xatolik";
    res.status(400).json({ error: msg });
  }
});

/**
 * PUT /api/products/:id
 */
router.put("/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id);

  const name = req.body?.name !== undefined ? String(req.body.name).trim() : undefined;
  const unit = req.body?.unit !== undefined ? String(req.body.unit).trim() : undefined;

  const barcodeRaw = req.body?.barcode;
  const barcode =
    barcodeRaw === null || barcodeRaw === undefined
      ? undefined
      : String(barcodeRaw).trim() === ""
        ? null
        : String(barcodeRaw).trim();

  const costPrice =
    req.body?.costPrice !== undefined ? Number(req.body.costPrice) : undefined;
  const salePrice =
    req.body?.salePrice !== undefined ? Number(req.body.salePrice) : undefined;
  const stockQty =
    req.body?.stockQty !== undefined ? Number(req.body.stockQty) : undefined;
  const minQty =
    req.body?.minQty !== undefined ? Number(req.body.minQty) : undefined;

  if (name !== undefined && !name) return res.status(400).json({ error: "name bo'sh bo'lmasin" });
  if (costPrice !== undefined && (Number.isNaN(costPrice) || costPrice < 0)) return res.status(400).json({ error: "costPrice xato" });
  if (salePrice !== undefined && (Number.isNaN(salePrice) || salePrice < 0)) return res.status(400).json({ error: "salePrice xato" });
  if (stockQty !== undefined && (Number.isNaN(stockQty) || stockQty < 0)) return res.status(400).json({ error: "stockQty xato" });
  if (minQty !== undefined && (Number.isNaN(minQty) || minQty < 0)) return res.status(400).json({ error: "minQty xato" });

  try {
    const item = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(unit !== undefined ? { unit } : {}),
        ...(barcode !== undefined ? { barcode } : {}),
        ...(costPrice !== undefined ? { costPrice } : {}),
        ...(salePrice !== undefined ? { salePrice } : {}),
        ...(stockQty !== undefined ? { stockQty } : {}),
        ...(minQty !== undefined ? { minQty } : {}),
      },
    });

    res.json({ item });
  } catch (e: any) {
    const msg = e?.message || "Product update xatolik";
    res.status(400).json({ error: msg });
  }
});

/**
 * DELETE /api/products/:id
 */
router.delete("/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id);

  try {
    await prisma.product.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message || "Product o‘chirish xatolik";
    res.status(400).json({ error: msg });
  }
});

export default router;
