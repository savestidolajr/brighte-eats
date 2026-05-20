-- CreateTable
CREATE TABLE "ServiceInterestChange" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "serviceCode" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'registration',
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceInterestChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceInterestChange_leadId_idx" ON "ServiceInterestChange"("leadId");

-- AddForeignKey
ALTER TABLE "ServiceInterestChange" ADD CONSTRAINT "ServiceInterestChange_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
