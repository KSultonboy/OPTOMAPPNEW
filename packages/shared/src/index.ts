import { z } from "zod";


export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  barcode: z.string().nullable().optional(),
  unit: z.enum(["PCS", "KG"]).default("PCS"),
  costPrice: z.number(),
  salePrice: z.number(),
  stockQty: z.number(),
  minQty: z.number(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional()
});

export type Product = z.infer<typeof ProductSchema>;

export const ProductsListSchema = z.object({
  items: z.array(ProductSchema),
  page: z.number(),
  pageSize: z.number(),
  total: z.number()
});


export const LoginResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.string(),
    name: z.string().optional(),
  }).optional(),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;


export type ProductsList = z.infer<typeof ProductsListSchema>;
