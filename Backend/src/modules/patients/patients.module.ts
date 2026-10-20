import { Module } from '@nestjs/common';
import { MedicalModule } from '../medical/medical.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';

@Module({
  imports: [ReservationsModule, MedicalModule],
  controllers: [PatientsController],
  providers: [PatientsService],
})
export class PatientsModule {}
