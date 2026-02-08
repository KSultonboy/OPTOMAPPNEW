-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "loyalSalePrice" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN "imageUrl" TEXT;

-- Default loyal narxni oddiy narxga tenglashtiramiz
UPDATE "Product" SET "loyalSalePrice" = "salePrice" WHERE "loyalSalePrice" = 0;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customer" TEXT,
    "customerType" TEXT NOT NULL DEFAULT 'REGULAR',
    "customerId" TEXT,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "subtotal" REAL NOT NULL DEFAULT 0,
    "discount" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Sale" ("id", "customer", "paymentMethod", "subtotal", "discount", "total", "createdAt")
SELECT "id", "customer", "paymentMethod", "subtotal", "discount", "total", "createdAt" FROM "Sale";
DROP TABLE "Sale";
ALTER TABLE "new_Sale" RENAME TO "Sale";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");
