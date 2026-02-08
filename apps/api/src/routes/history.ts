import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

type SaleEditItem = { productId: string; qty: number; price: number };
type ReceiptEditItem = { productId: string; qty: number; costPrice: number };

// GET /api/history?limit=80
router.get("/", requireAuth, async (req, res) => {
    const limitRaw = Number(req.query.limit ?? 80);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 80;

    const [sales, receipts, expenses] = await Promise.all([
        prisma.sale.findMany({
            orderBy: { createdAt: "desc" },
            take: limit,
            include: { items: { include: { product: true } } },
        }),
        prisma.receipt.findMany({
            orderBy: { createdAt: "desc" },
            take: limit,
            include: { items: { include: { product: true } } },
        }),
        prisma.expense.findMany({
            orderBy: { createdAt: "desc" },
            take: limit,
        }),
    ]);

    const saleItems = sales.map((s) => ({
        type: "SALE" as const,
        id: s.id,
        createdAt: s.createdAt.toISOString(),
        total: s.total ?? 0,
        paymentMethod: s.paymentMethod,
        customerType: s.customerType,
        customerId: s.customerId ?? null,
        customer: s.customer ?? null,
        items: s.items.map((it) => ({
            productId: it.productId,
            name: it.product?.name ?? "—",
            unit: it.product?.unit ?? "DONA",
            qty: Number(it.qty ?? 0),
            price: Number(it.price ?? 0),
            lineTotal: Number(it.lineTotal ?? 0),
        })),

    }));

    const receiptItems = receipts.map((r) => ({
        type: "RECEIPT" as const,
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        total: r.totalCost ?? 0,
        note: r.note ?? null,
        items: r.items.map((it) => ({
            productId: it.productId,
            name: it.product?.name ?? "—",
            unit: it.product?.unit ?? "DONA",
            qty: Number(it.qty ?? 0),
            price: Number(it.costPrice ?? 0),     // frontendda "price" deb yuritamiz
            lineTotal: Number(it.lineCost ?? 0),
        })),

    }));

    // map expenses to a simple row compatible with UI
    const expenseItems = expenses.map((e) => ({
        type: "EXPENSE" as const,
        id: e.id,
        createdAt: e.createdAt.toISOString(),
        total: Number(e.amount ?? 0),
        note: e.note ?? null,
        items: [
            {
                productId: "-",
                name: e.name || "Xarajat",
                unit: "",
                qty: 1,
                price: Number(e.amount ?? 0),
                lineTotal: Number(e.amount ?? 0),
            },
        ],
    }));

    const items = [...saleItems, ...receiptItems, ...expenseItems]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);

    return res.json({ items });
});

// PATCH /api/history/:type/:id/meta
router.patch("/:type/:id/meta", requireAuth, async (req, res) => {
    const type = String(req.params.type).toUpperCase();
    const id = String(req.params.id);

    if (type === "SALE") {
        const customer = req.body?.customer;
        const paymentMethod = req.body?.paymentMethod;

        const updated = await prisma.sale.update({
            where: { id },
            data: {
                ...(customer !== undefined ? { customer: String(customer) } : {}),
                ...(paymentMethod !== undefined ? { paymentMethod } : {}),
            },
            select: { id: true, customer: true, paymentMethod: true, total: true, createdAt: true },
        });

        return res.json({ sale: updated });
    }

    if (type === "RECEIPT") {
        const note = req.body?.note;

        const updated = await prisma.receipt.update({
            where: { id },
            data: { ...(note !== undefined ? { note: String(note) } : {}) },
            select: { id: true, note: true, totalCost: true, createdAt: true },
        });

        return res.json({ receipt: updated });
    }

    return res.status(400).json({ error: "Invalid type" });
});

// DELETE /api/history/:type/:id
router.delete("/:type/:id", requireAuth, async (req, res) => {
    const type = String(req.params.type).toUpperCase();
    const id = String(req.params.id);

    if (type === "SALE") {
        await prisma.$transaction(async (tx) => {
            const sale = await tx.sale.findUnique({
                where: { id },
                include: { items: true },
            });
            if (!sale) throw Object.assign(new Error("Sale not found"), { status: 404 });

            // stockni qaytarish (sale OUT bo‘lgani uchun increment)
            for (const it of sale.items) {
                await tx.product.update({
                    where: { id: it.productId },
                    data: { stockQty: { increment: it.qty } },
                });
            }

            // movementlarni o‘chirish
            await tx.stockMovement.deleteMany({ where: { saleId: id } });

            // sale o‘chirish (cascade saleItems)
            await tx.sale.delete({ where: { id } });
        });

        return res.json({ ok: true });
    }

    if (type === "RECEIPT") {
        await prisma.$transaction(async (tx) => {
            const receipt = await tx.receipt.findUnique({
                where: { id },
                include: { items: true },
            });
            if (!receipt) throw Object.assign(new Error("Receipt not found"), { status: 404 });

            // stockni qaytarish (receipt IN bo‘lgani uchun decrement)
            for (const it of receipt.items) {
                await tx.product.update({
                    where: { id: it.productId },
                    data: { stockQty: { decrement: it.qty } },
                });
            }

            // movementlarni o‘chirish
            await tx.stockMovement.deleteMany({ where: { receiptId: id } });

            // receipt o‘chirish (cascade receiptItems)
            await tx.receipt.delete({ where: { id } });
        });

        return res.json({ ok: true });
    }

    if (type === "EXPENSE") {
        await prisma.expense.delete({ where: { id } }).catch((e: any) => {
            const status = e?.status ?? 400;
            const msg = e?.message || "Expense delete failed";
            return res.status(status).json({ error: msg });
        });
        return res.json({ ok: true });
    }

    return res.status(400).json({ error: "Invalid type" });
});

// PUT /api/history/:type/:id/items
// SALE body: { items: [{productId, qty, price}] }
// RECEIPT body: { items: [{productId, qty, costPrice}], note? }
router.put("/:type/:id/items", requireAuth, async (req, res) => {
    const type = String(req.params.type).toUpperCase();
    const id = String(req.params.id);

    if (!Array.isArray(req.body?.items) || req.body.items.length === 0) {
        return res.status(400).json({ error: "Items required" });
    }

    if (type === "SALE") {
        const incoming: SaleEditItem[] = req.body.items.map((i: any) => ({
            productId: String(i.productId),
            qty: Number(i.qty),
            price: Number(i.price),
        }));

        for (const it of incoming) {
            if (!it.productId) return res.status(400).json({ error: "productId required" });
            if (!(it.qty > 0)) return res.status(400).json({ error: "qty must be > 0" });
            if (Number.isNaN(it.price) || it.price < 0) return res.status(400).json({ error: "invalid price" });
        }

        const subtotal = incoming.reduce((s, it) => s + it.qty * it.price, 0);
        const total = subtotal;

        const sale = await prisma.$transaction(async (tx) => {
            const old = await tx.sale.findUnique({
                where: { id },
                include: { items: true },
            });
            if (!old) throw Object.assign(new Error("Sale not found"), { status: 404 });

            // 1) eski sotuvni stockga qaytarib qo‘yamiz (increment)
            for (const it of old.items) {
                await tx.product.update({
                    where: { id: it.productId },
                    data: { stockQty: { increment: it.qty } },
                });
            }

            // 2) yangi sotuv bo‘yicha stock yetarliligini tekshiramiz (hozirgi stock + qaytarilgan stock holatida)
            for (const it of incoming) {
                const p = await tx.product.findUnique({ where: { id: it.productId } });
                if (!p) throw Object.assign(new Error("Product not found"), { status: 404 });
                if (p.stockQty < it.qty) {
                    throw Object.assign(new Error(`Stock yetarli emas: ${p.name}`), { status: 400 });
                }
            }

            // 3) eski itemlarni o‘chiramiz
            await tx.saleItem.deleteMany({ where: { saleId: id } });

            // 4) sale totals update + yangi items create
            const updated = await tx.sale.update({
                where: { id },
                data: {
                    subtotal,
                    total,
                    items: {
                        create: incoming.map((it) => ({
                            productId: it.productId,
                            qty: it.qty,
                            price: it.price,
                            lineTotal: it.qty * it.price,
                        })),
                    },
                },
                include: { items: { include: { product: true } } },
            });

            // 5) eski movementlarni tozalaymiz, yangisini yozamiz
            await tx.stockMovement.deleteMany({ where: { saleId: id } });

            for (const it of updated.items) {
                await tx.product.update({
                    where: { id: it.productId },
                    data: { stockQty: { decrement: it.qty } },
                });

                await tx.stockMovement.create({
                    data: {
                        type: "OUT",
                        qty: it.qty,
                        note: "Sale (Sotuv) [edited]",
                        productId: it.productId,
                        saleId: updated.id,
                    },
                });
            }

            return updated;
        });

        return res.json({ sale });
    }

    if (type === "RECEIPT") {
        const note = req.body?.note !== undefined ? String(req.body.note).trim() : undefined;

        const incoming: ReceiptEditItem[] = req.body.items.map((i: any) => ({
            productId: String(i.productId),
            qty: Number(i.qty),
            costPrice: Number(i.costPrice),
        }));

        for (const it of incoming) {
            if (!it.productId) return res.status(400).json({ error: "productId required" });
            if (!(it.qty > 0)) return res.status(400).json({ error: "qty must be > 0" });
            if (Number.isNaN(it.costPrice) || it.costPrice < 0) return res.status(400).json({ error: "invalid costPrice" });
        }

        const totalCost = incoming.reduce((s, it) => s + it.qty * it.costPrice, 0);

        const receipt = await prisma.$transaction(async (tx) => {
            const old = await tx.receipt.findUnique({
                where: { id },
                include: { items: true },
            });
            if (!old) throw Object.assign(new Error("Receipt not found"), { status: 404 });

            // 1) eski qabulni stockdan olib tashlaymiz (decrement)
            for (const it of old.items) {
                await tx.product.update({
                    where: { id: it.productId },
                    data: { stockQty: { decrement: it.qty } },
                });
            }

            // 2) eski itemlarni o‘chiramiz
            await tx.receiptItem.deleteMany({ where: { receiptId: id } });

            // 3) receipt update + yangi items create
            const updated = await tx.receipt.update({
                where: { id },
                data: {
                    ...(note !== undefined ? { note } : {}),
                    totalCost,
                    items: {
                        create: incoming.map((it) => ({
                            productId: it.productId,
                            qty: it.qty,
                            costPrice: it.costPrice,
                            lineCost: it.qty * it.costPrice,
                        })),
                    },
                },
                include: { items: { include: { product: true } } },
            });

            // 4) movementlarni yangilaymiz
            await tx.stockMovement.deleteMany({ where: { receiptId: id } });

            for (const it of updated.items) {
                await tx.product.update({
                    where: { id: it.productId },
                    data: { stockQty: { increment: it.qty }, costPrice: it.costPrice },
                });

                await tx.stockMovement.create({
                    data: {
                        type: "IN",
                        qty: it.qty,
                        note: "Receipt (Qabul) [edited]",
                        productId: it.productId,
                        receiptId: updated.id,
                    },
                });
            }

            return updated;
        });

        return res.json({ receipt });
    }

    return res.status(400).json({ error: "Invalid type" });
});

export default router;
