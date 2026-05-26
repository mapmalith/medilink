import { IsString } from 'class-validator';

export class UpdateConfigDto {
  @IsString()
  value!: string;
}
