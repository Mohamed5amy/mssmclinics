import { Module } from '@nestjs/common';
import { ReservationsModule } from '../reservations/reservations.module';
import { MedicalController } from './medical.controller';
import { MedicalService } from './medical.service';

@Module({
  imports: [ReservationsModule],
  controllers: [MedicalController],
  providers: [MedicalService],
  exports: [MedicalService],
})
export class MedicalModule {}
