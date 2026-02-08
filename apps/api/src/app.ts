import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth";
import productsRoutes from "./routes/products";
import receiptsRoutes from "./routes/receipts";
import salesRoutes from "./routes/sales";
import reportsRoutes from "./routes/reports";
import historyRoutes from "./routes/history";
import expensesRoutes from "./routes/expenses";
import customersRoutes from "./routes/customers";

export const app = express();
const bodyLimit = process.env.BODY_LIMIT || "50mb";

const rawOrigins = String(process.env.CORS_ORIGIN ?? "*")
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);

if (rawOrigins.length === 0 || rawOrigins.includes("*")) {
  app.use(cors());
} else {
  app.use(
    cors({
      origin(origin, callback) {
        // Native mobile/desktop requests can be origin-less.
        if (!origin) return callback(null, true);
        if (rawOrigins.includes(origin)) return callback(null, true);
        return callback(null, false);
      },
    })
  );
}

app.use(express.json({ limit: bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/receipts", receiptsRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/expenses", expensesRoutes);
app.use("/api/customers", customersRoutes);
