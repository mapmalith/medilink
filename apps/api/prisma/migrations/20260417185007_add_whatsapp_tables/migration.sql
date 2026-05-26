-- CreateEnum
CREATE TYPE "WhatsAppConversationState" AS ENUM ('IDLE', 'AWAITING_NAME', 'AWAITING_TYPE', 'AWAITING_DATE', 'AWAITING_TIME_SLOT', 'AWAITING_CONFIRMATION');

-- CreateTable
CREATE TABLE "whatsapp_conversations" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "state" "WhatsAppConversationState" NOT NULL DEFAULT 'IDLE',
    "state_data" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_logs" (
    "id" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "state" TEXT,
    "message_sid" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_conversations_phone_key" ON "whatsapp_conversations"("phone");

-- CreateIndex
CREATE INDEX "whatsapp_logs_phone_idx" ON "whatsapp_logs"("phone");

-- CreateIndex
CREATE INDEX "whatsapp_logs_created_at_idx" ON "whatsapp_logs"("created_at");
