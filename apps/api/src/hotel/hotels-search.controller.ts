import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles } from '../auth/decorators';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Cross-hotel search endpoint used by the call-center booking wizard's
 * Step 0 ("Patient or Hotel?") to populate the hotel typeahead. Returns
 * a small projection of hotels matching the query string.
 */
@Controller('hotels')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.CALL_CENTER)
export class HotelsSearchController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('search')
  async search(@Query('q') q?: string) {
    const term = (q ?? '').trim();
    const where: Prisma.HotelWhereInput = term
      ? {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { address: { contains: term, mode: 'insensitive' } },
          ],
        }
      : {};

    const hotels = await this.prisma.hotel.findMany({
      where,
      select: {
        id: true,
        name: true,
        address: true,
        contactPerson: true,
        phone: true,
      },
      orderBy: { name: 'asc' },
      take: 20,
    });

    return { success: true, data: hotels };
  }
}
