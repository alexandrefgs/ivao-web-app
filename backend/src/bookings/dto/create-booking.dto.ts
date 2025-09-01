import { IsString, IsISO8601 } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  position: string;

  @IsISO8601()
  fromDate: string;

  @IsISO8601()
  toDate: string;
}
