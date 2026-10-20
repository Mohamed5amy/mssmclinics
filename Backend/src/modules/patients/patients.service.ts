import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthUser } from '../../common/auth-user';
import { CountersService } from '../../counters/counters.service';
import { LookupsService } from '../../database/lookups.service';
import { ScopeService } from '../../database/scope.service';
import { Clinic } from '../clinics/clinic.schema';
import { Provider } from '../providers/provider.schema';
import { MedicalService } from '../medical/medical.service';
import { ReservationsService } from '../reservations/reservations.service';
import { CreatePatientDto, UpdatePatientDto } from './dto/patient.dto';
import { Patient } from './patient.schema';

/** One file per patient for the whole group: any branch's desk finds and books them. */
@Injectable()
export class PatientsService {
  constructor(
    @InjectModel(Patient.name) private readonly model: Model<Patient>,
    @InjectModel(Provider.name) private readonly providers: Model<Provider>,
    @InjectModel(Clinic.name) private readonly clinics: Model<Clinic>,
    private readonly counters: CountersService,
    private readonly lookups: LookupsService,
    private readonly scope: ScopeService,
    private readonly reservations: ReservationsService,
    private readonly medical: MedicalService,
  ) {}

  /**
   * Adds `groupName`, the registering branch (`clinicName`, `clinicBranch`),
   * `providerName`, which the patient pages render, and `no_shows`, how many
   * times the patient didn't come. The front desk doesn't get the medical
   * background.
   */
  private async decorate(rows: Patient[], user: AuthUser) {
    const [groups, clinics, providers, noShows] = await Promise.all([
      this.lookups.groupsById(),
      this.lookups.clinicsById(),
      this.lookups.providersById(),
      this.reservations.noShowCounts(this.scope.groupFilter(user)),
    ]);

    return rows.map(({ medical, ...row }) => ({
      ...row,
      ...(user.role === 'receptionist' ? {} : { medical }),
      no_shows: noShows.get(row.id) ?? 0,
      groupName: groups.get(row.group_id)?.name ?? '',
      clinicName: clinics.get(row.registered_clinic_id)?.name ?? '',
      clinicBranch: clinics.get(row.registered_clinic_id)?.branch ?? '',
      providerName: providers.get(row.provider_id)?.title ?? '',
    }));
  }

  /** A saved patient as the account may see it: the front desk without the medical background. */
  private forDesk<T extends { medical?: unknown }>({ medical, ...row }: T, user: AuthUser) {
    return user.role === 'receptionist' ? row : { ...row, medical };
  }

  /** `groupId` is the platform owner's group filter. */
  async findAll(user: AuthUser, groupId?: number) {
    const filter = this.scope.groupFilter(user, groupId);
    return this.decorate(await this.model.find(filter).sort({ id: 1 }).lean(), user);
  }

  private async findScoped(id: number, user: AuthUser) {
    const patient = await this.model.findOne({ id, ...this.scope.groupFilter(user) }).lean();
    if (!patient) {
      throw new NotFoundException('This patient was not found');
    }
    return patient;
  }

  /** The file, with the visits the account may see (a receptionist: its own branch's). */
  async findOne(id: number, user: AuthUser) {
    const [decorated] = await this.decorate([await this.findScoped(id, user)], user);
    return { ...decorated, reservations: await this.reservations.findForPatient(id, user) };
  }

  /** "How the patient reached us" options are the group's own. */
  private async assertProvider(providerId: number, groupId: number) {
    if (!(await this.providers.exists({ id: providerId, group_id: groupId }))) {
      throw new BadRequestException('Please choose how the patient reached the clinic');
    }
  }

  /** The branch shown as having registered the patient: the desk's own, or one the owner names. */
  private async registeringClinic(user: AuthUser, requested?: number): Promise<number | null> {
    if (user.clinic_ids) return user.clinic_ids[0] ?? null;
    if (!requested) return null;
    return (await this.clinics.exists({ id: requested, group_id: user.group_id })) ? requested : null;
  }

  /** The group's owner or a receptionist registers patients, always to their own group. */
  async create({ clinic_id, ...dto }: CreatePatientDto, user: AuthUser) {
    const groupId = this.scope.ownGroupId(user);
    await this.assertProvider(dto.provider_id, groupId);

    const created = await this.model.create({
      ...dto,
      group_id: groupId,
      registered_clinic_id: await this.registeringClinic(user, clinic_id),
      id: await this.counters.next('patient'),
    });
    return this.forDesk(created.toJSON(), user);
  }

  async update({ id, ...changes }: UpdatePatientDto, user: AuthUser) {
    const patient = await this.findScoped(id, user);

    if (changes.provider_id) {
      await this.assertProvider(changes.provider_id, patient.group_id);
    }

    const updated = await this.model.findOneAndUpdate({ id }, { $set: changes }, { new: true });
    return this.forDesk(updated.toJSON(), user);
  }

  /** The patient's attached files go too; past visits stay with their snapshots. */
  async remove(id: number, user: AuthUser) {
    await this.findScoped(id, user);
    await this.model.deleteOne({ id });
    await this.medical.forget({ patient_id: id });
    return { id };
  }
}
