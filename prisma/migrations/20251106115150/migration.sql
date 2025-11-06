/*
  Warnings:

  - You are about to drop the column `userId` on the `PaymentMethod` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[orderId]` on the table `PaymentMethod` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `orderId` to the `PaymentMethod` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."PaymentMethod" DROP CONSTRAINT "PaymentMethod_userId_fkey";

-- AlterTable
ALTER TABLE "PaymentMethod" DROP COLUMN "userId",
ADD COLUMN     "orderId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_orderId_key" ON "PaymentMethod"("orderId");

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
