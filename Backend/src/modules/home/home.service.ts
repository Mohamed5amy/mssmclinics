import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthUser } from '../../common/auth-user';
import { ScopeQueryDto } from '../../common/dto/query.dto';
import { ScopeService } from '../../database/scope.service';
import { Clinic } from '../clinics/clinic.schema';
import { Doctor } from '../doctors/doctor.schema';
import { Group } from '../groups/group.schema';
import { Patient } from '../patients/patient.schema';
import { Reservation } from '../reservations/reservation.schema';
import { Service } from '../services/service.schema';
import { Specialty } from '../specialties/specialty.schema';
import { Staff, StaffRole } from '../staff/staff.schema';

@Injectable()
export class HomeService {
  constructor(
    @InjectModel(Group.name) private readonly groups: Model<Group>,
    @InjectModel(Clinic.name) private readonly clinics: Model<Clinic>,
    @InjectModel(Doctor.name) private readonly doctors: Model<Doctor>,
    @InjectModel(Staff.name) private readonly staff: Model<Staff>,
    @InjectModel(Patient.name) private readonly patients: Model<Patient>,
    @InjectModel(Reservation.name) private readonly reservations: Model<Reservation>,
    @InjectModel(Service.name) private readonly services: Model<Service>,
    @InjectModel(Specialty.name) private readonly specialties: Model<Specialty>,
    private readonly scope: ScopeService,
  ) {}

  /**
   * The counter tiles on the insights page: the platform's (optionally one
   * group's) or an owner's group, optionally narrowed to one branch.
   */
  async summary(user: AuthUser, query: ScopeQueryDto) {
    const group = this.scope.groupFilter(user, query.group_id);
    const atBranch = query.clinic_id ? { clinic_ids: query.clinic_id } : {};

    const [
      groups_count,
      clinics_count,
      doctors_count,
      receptionists_count,
      patients_count,
      reservations_count,
      services_count,
      specialties_count,
    ] = await Promise.all([
      this.groups.countDocuments(group.group_id === undefined ? {} : { id: group.group_id }),
      this.clinics.countDocuments({ ...this.scope.branchFilter(user, query.group_id), ...(query.clinic_id ? { id: query.clinic_id } : {}) }),
      this.doctors.countDocuments({ ...group, ...atBranch }),
      this.staff.countDocuments({ ...group, role: StaffRole.Receptionist, ...atBranch }),
      this.patients.countDocuments(group),
      this.reservations.countDocuments(this.scope.clinicFilter(user, query.clinic_id, query.group_id)),
      this.services.countDocuments(group),
      this.specialties.countDocuments(group),
    ]);

    return {
      groups_count,
      clinics_count,
      doctors_count,
      receptionists_count,
      patients_count,
      reservations_count,
      services_count,
      specialties_count,
    };
  }
}
