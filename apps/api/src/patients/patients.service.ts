import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CreatePatientDto } from './dto/patient.dto';

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Search patients by name, email, passport or whatsapp number. When the
   * caller is a HOTEL user, results are scoped to that hotel. Returns a lean
   * list suitable for the booking wizard's patient picker.
   */
  async search(query: string | undefined, userId: string, userRole: Role) {
    const where: Prisma.PatientWhereInput = {};

    if (userRole === Role.HOTEL) {
      const hotel = await this.prisma.hotel.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!hotel) {
        throw new ForbiddenException('No hotel profile linked to this user');
      }
      where.hotelId = hotel.id;
    }

    if (query && query.trim().length > 0) {
      const q = query.trim();
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { emailAddress: { contains: q, mode: 'insensitive' } },
        { passportNumber: { contains: q, mode: 'insensitive' } },
        { whatsappNumber: { contains: q, mode: 'insensitive' } },
      ];
    }

    const patients = await this.prisma.patient.findMany({
      where,
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        emailAddress: true,
        whatsappNumber: true,
        passportNumber: true,
        nationality: true,
        dateOfBirth: true,
        hotelId: true,
      },
    });

    return patients;
  }

  /**
   * Create a patient + linked user. HOTEL callers are forced to attach the
   * patient to their own hotel.
   */
  async create(dto: CreatePatientDto, userId: string, userRole: Role) {
    let hotelId: string | null | undefined = dto.hotelId ?? null;
    if (userRole === Role.HOTEL) {
      const hotel = await this.prisma.hotel.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!hotel) {
        throw new ForbiddenException('No hotel profile linked to this user');
      }
      hotelId = hotel.id;
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await this.authService.hashPassword(dto.password);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          phone: dto.phone,
          passwordHash,
          role: Role.PATIENT,
        },
      });

      const patient = await tx.patient.create({
        data: {
          userId: user.id,
          firstName: dto.firstName,
          lastName: dto.lastName,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          nationality: dto.nationality,
          passportNumber: dto.passportNumber,
          whatsappNumber: dto.whatsappNumber,
          emailAddress: dto.email,
          hotelId: hotelId ?? undefined,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          emailAddress: true,
          whatsappNumber: true,
          passportNumber: true,
          nationality: true,
          dateOfBirth: true,
          hotelId: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'CREATE',
          entity: 'Patient',
          entityId: patient.id,
          details: {
            email: dto.email,
            firstName: dto.firstName,
            lastName: dto.lastName,
            bookedBy: userRole,
          } satisfies Prisma.InputJsonValue,
        },
      });

      return patient;
    });
  }
}
