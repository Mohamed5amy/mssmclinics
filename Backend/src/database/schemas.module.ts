import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Admin, AdminSchema } from '../modules/admins/admin.schema';
import { Clinic, ClinicSchema } from '../modules/clinics/clinic.schema';
import { Doctor, DoctorSchema } from '../modules/doctors/doctor.schema';
import { DoctorPayout, DoctorPayoutSchema } from '../modules/finance/payout.schema';
import { Group, GroupSchema } from '../modules/groups/group.schema';
import { PatientAttachment, PatientAttachmentSchema } from '../modules/medical/attachment.schema';
import { Patient, PatientSchema } from '../modules/patients/patient.schema';
import { Provider, ProviderSchema } from '../modules/providers/provider.schema';
import { Reservation, ReservationSchema } from '../modules/reservations/reservation.schema';
import {
  DoctorSchedule,
  DoctorScheduleSchema,
  ScheduleException,
  ScheduleExceptionSchema,
} from '../modules/schedules/schedule.schema';
import { Service, ServiceSchema } from '../modules/services/service.schema';
import { Specialty, SpecialtySchema } from '../modules/specialties/specialty.schema';
import { Staff, StaffSchema } from '../modules/staff/staff.schema';

const models = MongooseModule.forFeature([
  { name: Admin.name, schema: AdminSchema },
  { name: Group.name, schema: GroupSchema },
  { name: Staff.name, schema: StaffSchema },
  { name: Clinic.name, schema: ClinicSchema },
  { name: Doctor.name, schema: DoctorSchema },
  { name: DoctorPayout.name, schema: DoctorPayoutSchema },
  { name: Patient.name, schema: PatientSchema },
  { name: PatientAttachment.name, schema: PatientAttachmentSchema },
  { name: Provider.name, schema: ProviderSchema },
  { name: Reservation.name, schema: ReservationSchema },
  { name: DoctorSchedule.name, schema: DoctorScheduleSchema },
  { name: ScheduleException.name, schema: ScheduleExceptionSchema },
  { name: Service.name, schema: ServiceSchema },
  { name: Specialty.name, schema: SpecialtySchema },
]);

/**
 * Every model in one global module.
 *
 * Records reference each other by numeric id rather than ObjectId, so the
 * flattened fields the dashboard tables read (`doctorName`, `clinicBranch`, ...)
 * are assembled in code. Sharing the models here keeps that possible without
 * services having to depend on one another.
 */
@Global()
@Module({ imports: [models], exports: [models] })
export class SchemasModule {}
