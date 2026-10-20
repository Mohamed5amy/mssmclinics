import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Clinic } from '../modules/clinics/clinic.schema';
import { Doctor } from '../modules/doctors/doctor.schema';
import { Group } from '../modules/groups/group.schema';
import { Patient } from '../modules/patients/patient.schema';
import { Provider } from '../modules/providers/provider.schema';
import { Service } from '../modules/services/service.schema';
import { Specialty } from '../modules/specialties/specialty.schema';

/** Minimal shape of a related record, keyed by its numeric id. */
export type Index<T> = Map<number, T>;

export interface RelatedClinic {
  id: number;
  name: string;
  branch: string;
  group_id: number;
  status: string;
}
export interface RelatedDoctor {
  id: number;
  name: string;
  prectange: number;
  specialtie_id: number;
  group_id: number;
  clinic_ids: number[];
}

function index<T extends { id: number }>(rows: T[]): Index<T> {
  return new Map(rows.map((row) => [row.id, row]));
}

/**
 * Loads the reference data needed to flatten a list of records.
 *
 * Each list endpoint reads the handful of collections it needs once, rather than
 * issuing a query per row.
 */
@Injectable()
export class LookupsService {
  constructor(
    @InjectModel(Group.name) private readonly groups: Model<Group>,
    @InjectModel(Clinic.name) private readonly clinics: Model<Clinic>,
    @InjectModel(Doctor.name) private readonly doctors: Model<Doctor>,
    @InjectModel(Patient.name) private readonly patients: Model<Patient>,
    @InjectModel(Provider.name) private readonly providers: Model<Provider>,
    @InjectModel(Service.name) private readonly services: Model<Service>,
    @InjectModel(Specialty.name) private readonly specialties: Model<Specialty>,
  ) {}

  async groupsById(): Promise<Index<{ id: number; name: string; status: string }>> {
    return index(await this.groups.find().select('id name status').lean());
  }

  async clinicsById(): Promise<Index<RelatedClinic>> {
    return index(await this.clinics.find().select('id name branch group_id status').lean());
  }

  async doctorsById(): Promise<Index<RelatedDoctor>> {
    return index(
      await this.doctors.find().select('id name prectange specialtie_id group_id clinic_ids').lean(),
    );
  }

  async patientsById(): Promise<Index<{ id: number; name: string; phone: string }>> {
    return index(await this.patients.find().select('id name phone').lean());
  }

  async providersById(): Promise<Index<{ id: number; title: string }>> {
    return index(await this.providers.find().select('id title').lean());
  }

  async servicesById(): Promise<Index<{ id: number; name: string; price: number }>> {
    return index(await this.services.find().select('id name price').lean());
  }

  async specialtiesById(): Promise<Index<{ id: number; title: string }>> {
    return index(await this.specialties.find().select('id title').lean());
  }
}
