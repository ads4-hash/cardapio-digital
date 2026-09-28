-- AlterTable
ALTER TABLE "TentativaLogin" ADD COLUMN "emailHash" TEXT;

-- CreateIndex
CREATE INDEX "TentativaLogin_emailHash_criadoEm_idx" ON "TentativaLogin"("emailHash", "criadoEm");
