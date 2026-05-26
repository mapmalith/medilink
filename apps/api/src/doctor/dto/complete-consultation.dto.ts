import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PrescriptionItemDto {
  @IsString()
  drugId!: string;

  @IsString()
  dosage!: string;

  @IsString()
  frequency!: string;

  @IsString()
  duration!: string;

  @IsOptional()
  @IsString()
  instructions?: string;
}

export class CompleteConsultationDto {
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsBoolean()
  followUpRequired!: boolean;

  @IsOptional()
  @IsDateString()
  followUpDate?: string;

  @IsOptional()
  @IsString()
  followUpNotes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemDto)
  prescriptions!: PrescriptionItemDto[];
}
