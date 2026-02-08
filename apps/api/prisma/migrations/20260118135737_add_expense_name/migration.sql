/*
  Warnings:

  - You are about to drop the `ExpenseCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `categoryId` on the `Expense` table. All the data in the column will be lost.
  - Added the required column `name` to the `Expense` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ExpenseCategory_name_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ExpenseCategory";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Expense" ("amount", "createdAt", "id", "note") SELECT "amount", "createdAt", "id", "note" FROM "Expense";
DROP TABLE "Expense";
ALTER TABLE "new_Expense" RENAME TO "Expense";
CREATE INDEX "Expense_createdAt_idx" ON "Expense"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
