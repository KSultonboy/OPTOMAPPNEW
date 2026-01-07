import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/login", async (req, res) => {
  const login = String(req.body?.login ?? "").trim();
  const password = String(req.body?.password ?? "");

  const admin = await prisma.admin.findUnique({ where: { login } });
  if (!admin) return res.status(401).json({ error: "Login or password incorrect" });

  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) return res.status(401).json({ error: "Login or password incorrect" });

  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(500).json({ error: "JWT_SECRET missing" });

  const token = jwt.sign({ adminId: admin.id }, secret, { expiresIn: "7d" });

  return res.json({
    token,
    admin: { id: admin.id, login: admin.login },
  });
});

router.post("/change-password", requireAuth, async (req, res) => {
  const adminId = (req as any).admin?.adminId as string;

  const currentPassword = String(req.body?.currentPassword ?? "");
  const nextPassword = String(req.body?.nextPassword ?? "");

  if (nextPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 chars" });
  }

  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin) return res.status(404).json({ error: "Admin not found" });

  const ok = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!ok) return res.status(401).json({ error: "Current password incorrect" });

  const passwordHash = await bcrypt.hash(nextPassword, 10);
  await prisma.admin.update({ where: { id: adminId }, data: { passwordHash } });

  return res.json({ ok: true });
});

router.post("/change-login", requireAuth, async (req, res) => {
  const adminId = (req as any).admin?.adminId as string;

  const currentPassword = String(req.body?.currentPassword ?? "");
  const nextLogin = String(req.body?.nextLogin ?? "").trim();

  if (!nextLogin) return res.status(400).json({ error: "nextLogin required" });

  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin) return res.status(404).json({ error: "Admin not found" });

  const ok = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!ok) return res.status(401).json({ error: "Current password incorrect" });

  const exists = await prisma.admin.findUnique({ where: { login: nextLogin } });
  if (exists && exists.id !== adminId) {
    return res.status(409).json({ error: "Login already taken" });
  }

  const updated = await prisma.admin.update({
    where: { id: adminId },
    data: { login: nextLogin },
    select: { id: true, login: true },
  });

  return res.json({ admin: updated });
});

export default router;
