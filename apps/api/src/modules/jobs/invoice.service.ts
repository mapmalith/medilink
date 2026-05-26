import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { format } from 'date-fns';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../prisma/prisma.service';

interface InvoiceAppointment {
  id: string;
  scheduledTime: Date;
  appointmentType: string;
  amountCharged: Prisma.Decimal | null;
  currency: string;
  patient: { firstName: string; lastName: string } | null;
  doctor: { firstName: string; lastName: string; specialization: string | null } | null;
  medicalRecord: {
    diagnosis: string | null;
    notes: string | null;
    prescriptions: { dosage: string; frequency: string; duration: string; drug: { name: string } }[];
  } | null;
}

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Generate (or return existing) invoice for an appointment. Idempotent: if
   * an Invoice row already exists, returns it without re-rendering. Stores
   * PDFs on the local filesystem under apps/api/storage/invoices/.
   */
  async createInvoice(appointmentId: string) {
    const existing = await this.prisma.invoice.findUnique({
      where: { appointmentId },
    });
    if (existing) {
      return {
        invoice: existing,
        downloadUrl: this.downloadUrl(existing.invoiceNumber),
      };
    }

    const appointment = (await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        doctor: {
          select: { firstName: true, lastName: true, specialization: true },
        },
        medicalRecord: {
          include: {
            prescriptions: { include: { drug: { select: { name: true } } } },
          },
        },
      },
    })) as unknown as InvoiceAppointment | null;
    if (!appointment) {
      throw new Error(`Appointment ${appointmentId} not found`);
    }

    const invoiceNumber = await this.nextInvoiceNumber();
    const storageDir = this.storageDir();
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    const pdfPath = path.join(storageDir, `${invoiceNumber}.pdf`);

    await this.renderPdf(pdfPath, invoiceNumber, appointment);

    const invoice = await this.prisma.invoice.create({
      data: {
        appointmentId,
        invoiceNumber,
        amount: appointment.amountCharged ?? new Prisma.Decimal(0),
        currency: appointment.currency,
        pdfS3Key: `invoices/${invoiceNumber}.pdf`,
        sentViaWhatsApp: false,
      },
    });

    this.logger.log(`invoice ${invoiceNumber} created for ${appointmentId}`);
    return { invoice, downloadUrl: this.downloadUrl(invoiceNumber) };
  }

  async markSentViaWhatsApp(invoiceId: string) {
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { sentViaWhatsApp: true },
    });
  }

  downloadUrl(invoiceNumber: string): string {
    const baseUrl = this.config.get<string>(
      'MEDILINK_BASE_URL',
      'https://medilink.lk',
    );
    return `${baseUrl}/invoices/${invoiceNumber}`;
  }

  storageDir(): string {
    return path.join(process.cwd(), 'storage', 'invoices');
  }

  private async nextInvoiceNumber(): Promise<string> {
    const today = format(new Date(), 'yyyyMMdd');
    const prefix = `INV-${today}-`;
    const last = await this.prisma.invoice.findFirst({
      where: { invoiceNumber: { startsWith: prefix } },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });
    let next = 1;
    if (last) {
      const tail = last.invoiceNumber.slice(prefix.length);
      const parsed = parseInt(tail, 10);
      if (Number.isFinite(parsed)) next = parsed + 1;
    }
    return `${prefix}${String(next).padStart(4, '0')}`;
  }

  private async renderPdf(
    filePath: string,
    invoiceNumber: string,
    appointment: InvoiceAppointment,
  ): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = fs.createWriteStream(filePath);
      stream.on('finish', () => resolve());
      stream.on('error', reject);
      doc.pipe(stream);

      doc.fontSize(20).text('MEDI LINK', { align: 'left' });
      doc.fontSize(10).text('Medical Appointment Platform', { align: 'left' });
      doc.moveDown();

      doc.fontSize(14).text(`Invoice ${invoiceNumber}`, { align: 'left' });
      doc.fontSize(10).text(
        `Issued: ${format(new Date(), 'dd MMM yyyy HH:mm')}`,
      );
      doc.moveDown();

      doc.fontSize(12).text('Patient', { underline: true });
      doc.fontSize(10).text(
        appointment.patient
          ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
          : 'Unknown patient',
      );
      doc.moveDown(0.5);

      doc.fontSize(12).text('Doctor', { underline: true });
      doc.fontSize(10).text(
        appointment.doctor
          ? `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}` +
              (appointment.doctor.specialization
                ? ` (${appointment.doctor.specialization})`
                : '')
          : 'Unassigned',
      );
      doc.moveDown(0.5);

      doc.fontSize(12).text('Appointment', { underline: true });
      doc
        .fontSize(10)
        .text(`Type: ${appointment.appointmentType}`)
        .text(`Date: ${format(appointment.scheduledTime, 'dd MMM yyyy HH:mm')}`)
        .text(`Reference: ${appointment.id}`);
      doc.moveDown();

      if (appointment.medicalRecord) {
        doc.fontSize(12).text('Diagnosis', { underline: true });
        doc.fontSize(10).text(appointment.medicalRecord.diagnosis ?? '—');
        doc.moveDown(0.5);

        if (appointment.medicalRecord.prescriptions.length > 0) {
          doc.fontSize(12).text('Prescriptions', { underline: true });
          for (const p of appointment.medicalRecord.prescriptions) {
            doc
              .fontSize(10)
              .text(`• ${p.drug.name} — ${p.dosage}, ${p.frequency}, ${p.duration}`);
          }
          doc.moveDown(0.5);
        }

        if (appointment.medicalRecord.notes) {
          doc.fontSize(12).text('Notes', { underline: true });
          doc.fontSize(10).text(appointment.medicalRecord.notes);
          doc.moveDown(0.5);
        }
      }

      doc.moveDown();
      doc.fontSize(12).text('Charge', { underline: true });
      const amount = appointment.amountCharged?.toNumber() ?? 0;
      doc.fontSize(10).text(`Total: ${appointment.currency} ${amount.toFixed(2)}`);

      doc.end();
    });
  }
}
