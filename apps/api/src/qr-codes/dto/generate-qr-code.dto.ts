import { IsString } from 'class-validator';

export class GenerateQrCodeDto {
  @IsString()
  hotelId!: string;

  @IsString()
  location!: string;
}
