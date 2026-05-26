import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AppointmentType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { QUEUE_NAMES } from '../queue-tokens';

const DEFAULT_SLOT_DURATION_MIN = 30;
const DAYS_AHEAD = 7;

@Processor(QUEUE_NAMES.SLOT_GENERATION)
export class SlotGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(SlotGenerationProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(_job: Job): Promise<void> {
    const slotDuration = await this.resolveSlotDuration();

    const doctors = await this.prisma.doctor.findMany({
      where: { isAvailableTeleConsult: true },
      select: { id: true },
    });
    if (doctors.length === 0) {
      this.logger.log('slot-generation: no tele-consult doctors');
      return;
    }
    const doctorIds = doctors.map((d) => d.id);
    const availability = await this.prisma.doctorAvailability.findMany({
      where: {
        doctorId: { in: doctorIds },
        appointmentType: AppointmentType.TELE_CONSULTATION,
        isActive: true,
      },
    });

    let createdCount = 0;
    let processedDoctors = 0;

    const today = startOfUtcDay(new Date());
    for (const doctor of doctors) {
      const docAvail = availability.filter((a) => a.doctorId === doctor.id);
      if (docAvail.length === 0) continue;
      processedDoctors += 1;

      for (let dayOffset = 0; dayOffset < DAYS_AHEAD; dayOffset++) {
        const date = addDays(today, dayOffset);
        const dayOfWeek = date.getUTCDay(); // 0 = Sunday
        const slotsForDay = docAvail.filter((a) => a.dayOfWeek === dayOfWeek);

        for (const window of slotsForDay) {
          const startMinutes = parseHHMM(window.startTime);
          const endMinutes = parseHHMM(window.endTime);
          if (
            startMinutes === null ||
            endMinutes === null ||
            endMinutes <= startMinutes
          ) {
            continue;
          }

          for (
            let cursor = startMinutes;
            cursor + slotDuration <= endMinutes;
            cursor += slotDuration
          ) {
            const startTime = new Date(date);
            startTime.setUTCMinutes(startTime.getUTCMinutes() + cursor);
            const endTime = new Date(startTime);
            endTime.setUTCMinutes(endTime.getUTCMinutes() + slotDuration);

            const existing = await this.prisma.timeSlot.findFirst({
              where: {
                doctorId: doctor.id,
                date,
                startTime,
              },
              select: { id: true },
            });
            if (existing) continue;

            try {
              await this.prisma.timeSlot.create({
                data: {
                  doctorId: doctor.id,
                  date,
                  startTime,
                  endTime,
                  appointmentType: AppointmentType.TELE_CONSULTATION,
                  isBooked: false,
                },
              });
              createdCount += 1;
            } catch (err) {
              if (
                err instanceof Prisma.PrismaClientKnownRequestError &&
                err.code === 'P2002'
              ) {
                // Race with another job — slot already exists. Ignore.
                continue;
              }
              throw err;
            }
          }
        }
      }
    }

    this.logger.log(
      `slot-generation: generated ${createdCount} new slots for ${processedDoctors} doctors`,
    );
  }

  private async resolveSlotDuration(): Promise<number> {
    const row = await this.prisma.systemConfig.findUnique({
      where: { key: 'teleconsult_slot_duration_minutes' },
    });
    const parsed = row ? parseInt(row.value, 10) : NaN;
    return Number.isFinite(parsed) && parsed > 0
      ? parsed
      : DEFAULT_SLOT_DURATION_MIN;
  }
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function parseHHMM(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return h * 60 + mm;
}
