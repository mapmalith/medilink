import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RecordConsentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  consentType!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  consentText!: string;
}
