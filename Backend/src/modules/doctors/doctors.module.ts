import { Module } from '@nestjs/common';
import { ReservationsModule } from '../reservations/reservations.module';
import { DoctorsController } from './doctors.controller';
import { DoctorsService } from './doctors.service';

@Module({
  imports: [ReservationsModule],
  controllers: [DoctorsController],
  providers: [DoctorsService],
})
export class DoctorsModule {}
