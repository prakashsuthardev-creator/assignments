-- CreateTable
CREATE TABLE "records" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "eventDate" TEXT,
    "amount" DECIMAL(10,2),
    "status" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawData" JSONB NOT NULL,

    CONSTRAINT "records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_cursors" (
    "provider" TEXT NOT NULL,
    "cursor" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_cursors_pkey" PRIMARY KEY ("provider")
);

-- CreateTable
CREATE TABLE "task2_transactions" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceStatus" TEXT NOT NULL,
    "amountCents" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "raw" JSONB NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task2_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task2_status_allowlist" (
    "source" TEXT NOT NULL,
    "sourceStatus" TEXT NOT NULL,
    "isCollected" BOOLEAN NOT NULL,

    CONSTRAINT "task2_status_allowlist_pkey" PRIMARY KEY ("source","sourceStatus")
);

-- CreateIndex
CREATE UNIQUE INDEX "records_source_sourceId_key" ON "records"("source", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "task2_transactions_source_sourceId_key" ON "task2_transactions"("source", "sourceId");
