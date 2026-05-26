import { Module } from '@nestjs/common';
import { WhatsAppDispatcher } from './whatsapp-dispatcher.service';

/**
 * Low-level WhatsApp module with ONLY the dispatcher + its real/mock
 * implementations. Safe for business modules (Appointments, Payments,
 * Admin, Doctor) to import for injecting the dispatcher without creating
 * a circular dependency with the top-level WhatsAppModule (which itself
 * imports those business modules for the conversation flow).
 *
 * Depends only on ConfigService (global) and PrismaService (global).
 */
@Module({
  providers: [WhatsAppDispatcher],
  exports: [WhatsAppDispatcher],
})
export class WhatsAppCoreModule {}
