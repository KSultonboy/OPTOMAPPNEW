import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth";
import productsRoutes from "./routes/products";
import receiptsRoutes from "./routes/receipts";
import salesRoutes from "./routes/sales";
import reportsRoutes from "./routes/reports";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/receipts", receiptsRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/reports", reportsRoutes);
