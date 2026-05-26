import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { WhatsAppDispatcher } from '../../whatsapp/whatsapp-dispatcher.service';
import { TEMPLATES } from '../../whatsapp/templates';
import { InvoiceService } from '../invoice.service';
import { QUEUE_NAMES } from '../queue-tokens';

interface InvoicePayload {
  appointmentId: string;
}

@Processor(QUEUE_NAMES.INVOICE_GENERATION)
export class InvoiceGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(InvoiceGenerationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceSvc: InvoiceService,
    private readonly whatsapp: WhatsAppDispatcher,
  ) {
    super();
  }

  async process(job: Job<InvoicePayload>): Promise<void> {
    const { appointmentId } = job.data;
    const { invoice, downloadUrl } = await this.invoiceSvc.createInvoice(
      appointmentId,
    );

    if (invoice.sentViaWhatsApp) {
      this.logger.debug(`invoice ${invoice.invoiceNumber} already sent`);
      return;
    }

    const patient = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { patient: { select: { whatsappNumber: true } } },
    });

    await this.whatsapp.tryTextMessage(
      patient?.patient.whatsappNumber,
      TEMPLATES.diagnosisReady(downloadUrl),
      { appointmentId },
    );

    await this.invoiceSvc.markSentViaWhatsApp(invoice.id);
    this.logger.log(`invoice ${invoice.invoiceNumber} sent for ${appointmentId}`);
  }
}
