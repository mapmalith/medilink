import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AdminPricingService } from './admin-pricing.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../auth/decorators';
import { Role } from '@prisma/client';
import { CreatePricingDto, UpdatePricingDto } from './dto/pricing.dto';

@Controller('admin/pricing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminPricingController {
  constructor(private readonly pricingService: AdminPricingService) {}

  @Get()
  async findAll() {
    const data = await this.pricingService.findAll();
    return { success: true, data };
  }

  @Post()
  async create(
    @Body() dto: CreatePricingDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.pricingService.create(
      {
        appointmentType: dto.appointmentType,
        price: dto.price,
        currency: dto.currency,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
      },
      userId,
    );
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePricingDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.pricingService.update(
      id,
      {
        ...dto,
        effectiveFrom: dto.effectiveFrom
          ? new Date(dto.effectiveFrom)
          : undefined,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
        price: dto.price,
      },
      userId,
    );
    return { success: true, data };
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.pricingService.remove(id, userId);
    return { success: true, data };
  }
}
