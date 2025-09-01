import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Booking } from './bookings.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking) private readonly repo: Repository<Booking>,
  ) {}

  findAllFuture() {
    return this.repo.find({
      where: { toDate: MoreThan(new Date()) },
      order: { position: 'ASC', fromDate: 'ASC' },
    });
  }

  findByDate(dateISO: string) {
    const day = new Date(dateISO);
    if (isNaN(+day)) throw new BadRequestException('Invalid date');

    const start = new Date(day);
    start.setHours(0, 0, 0, 0);

    const end = new Date(day);
    end.setHours(23, 59, 59, 999);

    return this.repo
      .createQueryBuilder('b')
      .where('b.fromDate <= :end AND b.toDate >= :start', { start, end })
      .orderBy('b.position', 'ASC')
      .addOrderBy('b.fromDate', 'ASC')
      .getMany();
  }

  async create(dto: CreateBookingDto, vid: string) {
    if (!vid) throw new BadRequestException('Missing ivao-vid header');

    const fromDate = new Date(dto.fromDate);
    const toDate = new Date(dto.toDate);
    if (isNaN(+fromDate) || isNaN(+toDate))
      throw new BadRequestException('Invalid dates');
    if (fromDate >= toDate)
      throw new BadRequestException('fromDate must be before toDate');

    const userOverlap = await this.repo
      .createQueryBuilder('b')
      .where('b.vid = :vid', { vid })
      .andWhere('b.fromDate < :toDate AND b.toDate > :fromDate', {
        fromDate,
        toDate,
      })
      .getCount();
    if (userOverlap > 0)
      throw new BadRequestException(
        'User already has a booking in this interval',
      );

    const posOverlap = await this.repo
      .createQueryBuilder('b')
      .where('b.position = :position', { position: dto.position })
      .andWhere('b.fromDate < :toDate AND b.toDate > :fromDate', {
        fromDate,
        toDate,
      })
      .getCount();
    if (posOverlap > 0)
      throw new BadRequestException(
        'Position already booked in this interval',
      );

    const booking = this.repo.create({
      position: dto.position,
      fromDate,
      toDate,
      vid,
    });

    return this.repo.save(booking);
  }

  async update(id: number, dto: UpdateBookingDto, vid: string) {
    if (!vid) throw new BadRequestException('Missing ivao-vid header');

    const booking = await this.repo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.vid !== vid) throw new ForbiddenException('Not your booking');

    const nextPosition = dto.position ?? booking.position;
    const nextFrom = new Date(dto.fromDate ?? booking.fromDate);
    const nextTo = new Date(dto.toDate ?? booking.toDate);

    if (isNaN(+nextFrom) || isNaN(+nextTo))
      throw new BadRequestException('Invalid dates');
    if (nextFrom >= nextTo)
      throw new BadRequestException('fromDate must be before toDate');

    const overlap = await this.repo
      .createQueryBuilder('b')
      .where('b.id != :id', { id })
      .andWhere('b.position = :position', { position: nextPosition })
      .andWhere('b.fromDate < :toDate AND b.toDate > :fromDate', {
        fromDate: nextFrom,
        toDate: nextTo,
      })
      .getCount();
    if (overlap > 0)
      throw new BadRequestException('Overlap with another booking');

    booking.position = nextPosition;
    booking.fromDate = nextFrom;
    booking.toDate = nextTo;

    return this.repo.save(booking);
  }

  async remove(id: number, vid: string) {
    if (!vid) throw new BadRequestException('Missing ivao-vid header');

    const booking = await this.repo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.vid !== vid) throw new ForbiddenException('Not your booking');

    await this.repo.remove(booking);
    return { deleted: true };
  }
}
