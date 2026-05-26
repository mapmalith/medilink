import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  MinLength,
} from 'class-validator';

export class CreateHotelDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number;
}

export class UpdateHotelDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class GenerateQRCodeDto {
  @IsString()
  location!: string;
}

export class TopUpCreditDto {
  @IsNumber()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount!: number;

  @IsOptional()
  @IsString()
  description?: string;
}
