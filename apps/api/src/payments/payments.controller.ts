import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../auth/decorators';
import { CreatePaymentLinkDto, PayWithCreditDto } from './dto/payment.dto';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.CALL_CENTER, Role.HOTEL)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-link')
  async createLink(
    @Body() dto: CreatePaymentLinkDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    const data = await this.paymentsService.createPaymentLink(
      dto.appointmentId,
      user.id,
      user.role,
    );
    return { success: true, data };
  }

  @Post('credit')
  async payWithCredit(
    @Body() dto: PayWithCreditDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    const data = await this.paymentsService.payWithCredit(
      dto.appointmentId,
      user.id,
      user.role,
    );
    return { success: true, data };
  }

  @Get(':appointmentId/status')
  async getStatus(
    @Param('appointmentId') appointmentId: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    const data = await this.paymentsService.getPaymentStatus(
      appointmentId,
      user.id,
      user.role,
    );
    return { success: true, data };
  }
}
