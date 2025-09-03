import { IsISO8601, IsNotEmpty, IsString } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  position!: string;

  @IsISO8601()
  fromDate!: string;

  @IsISO8601()
  toDate!: string;
}
