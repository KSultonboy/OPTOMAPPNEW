import { z } from 'zod';

declare const ProductSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    barcode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    unit: z.ZodDefault<z.ZodEnum<{
        PCS: "PCS";
        KG: "KG";
    }>>;
    costPrice: z.ZodNumber;
    salePrice: z.ZodNumber;
    stockQty: z.ZodNumber;
    minQty: z.ZodNumber;
    createdAt: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
    updatedAt: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
}, z.core.$strip>;
type Product = z.infer<typeof ProductSchema>;
declare const ProductsListSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        barcode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        unit: z.ZodDefault<z.ZodEnum<{
            PCS: "PCS";
            KG: "KG";
        }>>;
        costPrice: z.ZodNumber;
        salePrice: z.ZodNumber;
        stockQty: z.ZodNumber;
        minQty: z.ZodNumber;
        createdAt: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
        updatedAt: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
    }, z.core.$strip>>;
    page: z.ZodNumber;
    pageSize: z.ZodNumber;
    total: z.ZodNumber;
}, z.core.$strip>;
declare const LoginResponseSchema: z.ZodObject<{
    token: z.ZodString;
    user: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
type LoginResponse = z.infer<typeof LoginResponseSchema>;
type ProductsList = z.infer<typeof ProductsListSchema>;

export { type LoginResponse, LoginResponseSchema, type Product, ProductSchema, type ProductsList, ProductsListSchema };
