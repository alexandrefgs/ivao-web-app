import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Headers,
  ParseIntPipe,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly service: BookingsService) {}

  @Get('future')
  findAllFuture() {
    return this.service.findAllFuture();
  }

  @Get('date/:dateISO')
  findByDate(@Param('dateISO') dateISO: string) {
    return this.service.findByDate(dateISO);
  }

  @Post()
  create(
    @Body() dto: CreateBookingDto,
    @Headers('ivao-vid') vid: string,
  ) {
    return this.service.create(dto, vid);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBookingDto,
    @Headers('ivao-vid') vid: string,
  ) {
    return this.service.update(id, dto, vid);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Headers('ivao-vid') vid: string,
  ) {
    return this.service.remove(id, vid);
  }
}
