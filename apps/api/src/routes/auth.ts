import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET missing");
  return secret;
}

router.post("/login", async (req, res) => {
  const login = String(req.body?.login ?? "").trim();
  const password = String(req.body?.password ?? "");

  if (!login || !password) {
    return res.status(400).json({ error: "login and password required" });
  }

  const admin = await prisma.admin.findUnique({ where: { login } });
  if (!admin) return res.status(401).json({ error: "Login or password incorrect" });

  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) return res.status(401).json({ error: "Login or password incorrect" });

  let token: string;
  try {
    token = jwt.sign({ adminId: admin.id }, getJwtSecret(), { expiresIn: "7d" });
  } catch (e) {
    return res.status(500).json({ error: "Token create failed" });
  }

  // ✅ Frontend va eski clientlar uchun ikkalasini ham qaytaramiz
  return res.json({
    token,
    admin: { id: admin.id, login: admin.login },
    user: { name: "Admin", login: admin.login }, // <- desktop store/auth.ts uchun
  });
});

router.post("/change-password", requireAuth, async (req, res) => {
  const adminId = (req as any).admin?.adminId as string;

  const currentPassword = String(req.body?.currentPassword ?? "");
  const nextPassword = String(req.body?.nextPassword ?? "");

  if (!currentPassword || !nextPassword) {
    return res.status(400).json({ error: "currentPassword and nextPassword required" });
  }

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

  if (!currentPassword || !nextLogin) {
    return res.status(400).json({ error: "currentPassword and nextLogin required" });
  }

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

  return res.json({
    admin: updated,
    user: { name: "Admin", login: updated.login },
  });
});

export default router;
