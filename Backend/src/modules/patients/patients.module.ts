import { Module } from '@nestjs/common';
import { ReservationsModule } from '../reservations/reservations.module';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';

@Module({
  imports: [ReservationsModule],
  controllers: [PatientsController],
  providers: [PatientsService],
})
export class PatientsModule {}
