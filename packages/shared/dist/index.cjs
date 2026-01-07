"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  LoginResponseSchema: () => LoginResponseSchema,
  ProductSchema: () => ProductSchema,
  ProductsListSchema: () => ProductsListSchema
});
module.exports = __toCommonJS(index_exports);
var import_zod = require("zod");
var ProductSchema = import_zod.z.object({
  id: import_zod.z.string(),
  name: import_zod.z.string(),
  barcode: import_zod.z.string().nullable().optional(),
  unit: import_zod.z.enum(["PCS", "KG"]).default("PCS"),
  costPrice: import_zod.z.number(),
  salePrice: import_zod.z.number(),
  stockQty: import_zod.z.number(),
  minQty: import_zod.z.number(),
  createdAt: import_zod.z.string().or(import_zod.z.date()).optional(),
  updatedAt: import_zod.z.string().or(import_zod.z.date()).optional()
});
var ProductsListSchema = import_zod.z.object({
  items: import_zod.z.array(ProductSchema),
  page: import_zod.z.number(),
  pageSize: import_zod.z.number(),
  total: import_zod.z.number()
});
var LoginResponseSchema = import_zod.z.object({
  token: import_zod.z.string(),
  user: import_zod.z.object({
    id: import_zod.z.string(),
    name: import_zod.z.string().optional()
  }).optional()
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  LoginResponseSchema,
  ProductSchema,
  ProductsListSchema
});
