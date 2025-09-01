import { Module } from '@nestjs/common';
import { DatabaseModule } from './database.module';
import { BookingsModule } from './bookings/bookings.module';

@Module({
  imports: [DatabaseModule, BookingsModule],
})
export class AppModule {}
