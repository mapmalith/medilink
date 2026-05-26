-- AlterTable
ALTER TABLE "whatsapp_logs" ADD COLUMN     "appointment_id" TEXT;

-- CreateIndex
CREATE INDEX "whatsapp_logs_appointment_id_idx" ON "whatsapp_logs"("appointment_id");
