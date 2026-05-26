import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';

const BASE_URL = process.env.APP_URL ?? 'https://medilink.lk';
const WHATSAPP_NUMBER =
  process.env.WHATSAPP_BUSINESS_NUMBER ?? '94771234567';

@Injectable()
export class QrCodesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a new QR code for a hotel. Creates the DB record and returns
   * it. The QR image is generated on-the-fly via `getImage()` so no S3
   * upload is needed in development.
   */
  async generate(hotelId: string, location: string, userId: string) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
    });
    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }

    const prefix = hotel.name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 20);
    const locCode = location
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 3);
    const code = `ML-${prefix}-${locCode}`;

    // Guard against duplicate codes.
    const existing = await this.prisma.qRCode.findUnique({ where: { code } });
    if (existing) {
      throw new BadRequestException(
        `QR code "${code}" already exists. Use a different location label.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const qrCode = await tx.qRCode.create({
        data: { hotelId, code, location },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'CREATE',
          entity: 'QRCode',
          entityId: qrCode.id,
          details: {
            hotelId,
            code,
            location,
          } satisfies Prisma.InputJsonValue,
        },
      });

      return qrCode;
    });
  }

  /**
   * Handle a QR scan: validate the code, bump `scanCount`, and return the
   * wa.me redirect URL for the caller to send the user to.
   */
  async scan(code: string) {
    const qr = await this.prisma.qRCode.findUnique({ where: { code } });
    if (!qr) {
      throw new NotFoundException('QR code not found');
    }
    if (!qr.isActive) {
      throw new BadRequestException('This QR code is no longer active');
    }

    await this.prisma.qRCode.update({
      where: { id: qr.id },
      data: { scanCount: { increment: 1 } },
    });

    const text = encodeURIComponent(`BOOK_${code}`);
    const redirectUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;

    return { code: qr.code, redirectUrl };
  }

  /**
   * Generate a QR code PNG buffer encoding `https://medilink.lk/qr/{code}`.
   * Generated on-the-fly — deterministic and fast (~5ms for a 300×300 PNG).
   */
  async getImage(code: string): Promise<Buffer> {
    const qr = await this.prisma.qRCode.findUnique({ where: { code } });
    if (!qr) {
      throw new NotFoundException('QR code not found');
    }

    const url = `${BASE_URL}/qr/${code}`;
    const png = await QRCode.toBuffer(url, {
      type: 'png',
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'M',
    });

    return png;
  }
}
