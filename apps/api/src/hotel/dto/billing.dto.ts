import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ListCreditLedgerQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  /**
   * Filter by ledger entry type (e.g. DEBIT, CREDIT, REFUND). Matched
   * case-insensitively.
   */
  @IsOptional()
  @IsString()
  type?: string;
}

export class ListHotelInvoicesQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
