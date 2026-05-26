import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsIn,
  MinLength,
} from 'class-validator';

export type StaffDepartment = 'ADMIN' | 'CALL_CENTER';

export class CreateStaffDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsIn(['ADMIN', 'CALL_CENTER'])
  department!: StaffDepartment;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class UpdateStaffDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsIn(['ADMIN', 'CALL_CENTER'])
  department?: StaffDepartment;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
