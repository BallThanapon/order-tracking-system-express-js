CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT','QUEUED','IN_PROGRESS','COMPLETED','DELAYED','FAILED','EXPIRED','REFUNDED');

CREATE TABLE "Order" (
  "id" TEXT NOT NULL,
  "orderNo" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "game" TEXT NOT NULL,
  "gameUid" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "paymentMethod" TEXT NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "workerId" TEXT,
  "leaseUntil" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Order_orderNo_key" ON "Order"("orderNo");
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status","createdAt");
CREATE INDEX "Order_leaseUntil_idx" ON "Order"("leaseUntil");

CREATE TABLE "OrderTimeline" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "from" "OrderStatus",
  "to" "OrderStatus" NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderTimeline_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderTimeline_orderId_createdAt_idx" ON "OrderTimeline"("orderId","createdAt");

ALTER TABLE "OrderTimeline"
  ADD CONSTRAINT "OrderTimeline_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ProcessedEvent" (
  "id" TEXT NOT NULL,
  "orderNo" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProcessedEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProcessedEvent_orderNo_idx" ON "ProcessedEvent"("orderNo");
