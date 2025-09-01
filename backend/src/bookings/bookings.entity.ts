import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity()
@Index(['position', 'fromDate', 'toDate'])
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  position: string;

  @Column({ type: 'datetime' })
  fromDate: Date;

  @Column({ type: 'datetime' })
  toDate: Date;

  @Column()
  vid: string;
}
