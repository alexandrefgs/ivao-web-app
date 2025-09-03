import { PartialType } from '@nestjs/mapped-types';
import { CreateBookingDto } from './create-booking.dto';
import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class UpdateBookingDto extends PartialType(CreateBookingDto) {
  @IsString()
  @IsOptional()
  position?: string;

  @IsISO8601()
  fromDate!: string;

  @IsISO8601()
  toDate!: string;
}
