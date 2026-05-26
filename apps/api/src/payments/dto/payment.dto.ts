import { IsString } from 'class-validator';

export class CreatePaymentLinkDto {
  @IsString()
  appointmentId!: string;
}

export class PayWithCreditDto {
  @IsString()
  appointmentId!: string;
}
