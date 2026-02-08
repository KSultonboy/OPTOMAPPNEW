const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

(async () => {
    const prisma = new PrismaClient();

    const login = process.env.ADMIN_LOGIN || "admin";
    const pass = process.env.ADMIN_PASS || "admin123";

    const passwordHash = await bcrypt.hash(pass, 10);

    await prisma.admin.upsert({
        where: { login },
        update: { passwordHash },
        create: { login, passwordHash },
    });

    console.log("✅ admin created/updated:", { login, pass });

    await prisma.$disconnect();
})().catch(async (e) => {
    console.error("❌ create-admin error:", e);
    try {
        const prisma = new PrismaClient();
        await prisma.$disconnect();
    } catch { }
    process.exit(1);
});
