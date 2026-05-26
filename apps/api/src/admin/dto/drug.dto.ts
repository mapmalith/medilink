import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateDrugDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  genericName?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  dosageForm?: string;

  @IsOptional()
  @IsString()
  strength?: string;
}

export class UpdateDrugDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  genericName?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  dosageForm?: string;

  @IsOptional()
  @IsString()
  strength?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
