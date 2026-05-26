-- AlterTable
ALTER TABLE "patients"
  ADD COLUMN "is_anonymized" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "anonymized_at" TIMESTAMP(3);
