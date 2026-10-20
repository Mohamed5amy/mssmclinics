import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types, mongo } from 'mongoose';
import { AuthUser } from '../../common/auth-user';
import { CountersService } from '../../counters/counters.service';
import { ScopeService } from '../../database/scope.service';
import { Doctor } from '../doctors/doctor.schema';
import { Patient } from '../patients/patient.schema';
import { Reservation, ReservationStatus } from '../reservations/reservation.schema';
import { ReservationsService } from '../reservations/reservations.service';
import { Staff } from '../staff/staff.schema';
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_TYPES, PatientAttachment } from './attachment.schema';
import { MedicalBackgroundDto, UploadAttachmentDto } from './dto/medical.dto';

/** The parts of an uploaded file this service reads (multer keeps it in memory). */
export interface UploadedFileData {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const fieldError = (field: string, message: string) =>
  new BadRequestException({ message, errors: { [field]: [message] } });

/** Trimmed, without blanks or repeats. */
const clean = (items: string[]) => [...new Set(items.map((item) => item.trim()).filter(Boolean))];

const EMPTY_BACKGROUND = { chronic: [], allergies: [], medications: [], notes: '', updated_at: null, updated_by: '' };

/**
 * A patient's medical file, for the group's doctors (and its owner; the
 * platform reads it): the medical background, every visit at any branch with
 * any of the group's doctors, and attached results and scans. The front desk
 * never sees it, as it never sees diagnoses.
 */
@Injectable()
export class MedicalService {
  constructor(
    @InjectModel(Patient.name) private readonly patients: Model<Patient>,
    @InjectModel(PatientAttachment.name) private readonly attachments: Model<PatientAttachment>,
    @InjectModel(Reservation.name) private readonly visits: Model<Reservation>,
    @InjectModel(Doctor.name) private readonly doctors: Model<Doctor>,
    @InjectModel(Staff.name) private readonly staff: Model<Staff>,
    @InjectConnection() private readonly connection: Connection,
    private readonly counters: CountersService,
    private readonly scope: ScopeService,
    private readonly reservations: ReservationsService,
  ) {}

  /** Where the attachments' bytes are kept. */
  private get bucket() {
    return new mongo.GridFSBucket(this.connection.db, { bucketName: 'attachments' });
  }

  private async patientFor(id: number, user: AuthUser) {
    const patient = await this.patients.findOne({ id, ...this.scope.groupFilter(user) }).lean();
    if (!patient) {
      throw new NotFoundException('This patient was not found');
    }
    return patient;
  }

  /** Who is writing, by name, for "last updated by" and "added by". */
  private async nameOf(user: AuthUser): Promise<string> {
    const account =
      user.role === 'doctor'
        ? await this.doctors.findOne({ id: user.id }).select('name').lean()
        : await this.staff.findOne({ id: user.id }).select('name').lean();
    return account?.name ?? '';
  }

  /**
   * The medical file: the background, the visits (with the diagnosis, without
   * the money), the attachments, and how many times the patient didn't come.
   */
  async file(patientId: number, user: AuthUser) {
    const patient = await this.patientFor(patientId, user);
    const [history, attachments] = await Promise.all([
      this.reservations.historyOf(patient.id, patient.group_id, user),
      this.attachments
        .find({ patient_id: patient.id, group_id: patient.group_id })
        .select('-file_id')
        .sort({ id: -1 })
        .lean(),
    ]);

    const visits = history.map((visit) => ({
      id: visit.id,
      CustomDate: visit.CustomDate,
      time: visit.time,
      status: visit.status,
      queue_state: visit.queue_state,
      doctor_id: visit.doctor_id,
      doctorName: visit.doctorName,
      doctorSpecalite: visit.doctorSpecalite,
      clinicName: visit.clinicName,
      serviceName: visit.serviceName,
      is_followup: visit.is_followup,
      Diagnosis: (visit as { Diagnosis?: string }).Diagnosis ?? '',
    }));

    return {
      patient_id: patient.id,
      name: patient.name,
      age: patient.age,
      sex: patient.sex,
      medical: { ...EMPTY_BACKGROUND, ...(patient.medical ?? {}) },
      visits,
      attachments,
      no_shows: visits.filter((visit) => visit.status === ReservationStatus.NoShow).length,
    };
  }

  /** Replaces the patient's medical background; a doctor or the owner, in their own group. */
  async saveBackground(dto: MedicalBackgroundDto, user: AuthUser) {
    const groupId = this.scope.ownGroupId(user);
    const patient = await this.patientFor(dto.patient_id, user);

    const medical = {
      chronic: clean(dto.chronic),
      allergies: clean(dto.allergies),
      medications: clean(dto.medications),
      notes: dto.notes?.trim() ?? '',
      updated_at: new Date(),
      updated_by: await this.nameOf(user),
    };
    await this.patients.updateOne({ id: patient.id, group_id: groupId }, { $set: { medical } });
    return medical;
  }

  /** Adds a file to the patient's medical file, optionally to one of their visits. */
  async upload(file: UploadedFileData | undefined, dto: UploadAttachmentDto, user: AuthUser) {
    const groupId = this.scope.ownGroupId(user);
    if (!file) {
      throw fieldError('file', 'Please choose a file');
    }
    if (!ATTACHMENT_TYPES.includes(file.mimetype)) {
      throw fieldError('file', 'Only images (JPG, PNG, WEBP) and PDF files can be attached');
    }
    if (file.size > ATTACHMENT_MAX_BYTES) {
      throw fieldError('file', 'File too large');
    }

    const patient = await this.patientFor(dto.patient_id, user);
    if (dto.reservation_id && !(await this.visits.exists({ id: dto.reservation_id, patient_id: patient.id, group_id: groupId }))) {
      throw fieldError('reservation_id', 'This visit was not found');
    }

    // Multer reads the name as Latin-1; Arabic names arrive as UTF-8 bytes.
    const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const created = await this.attachments.create({
      id: await this.counters.next('attachment'),
      group_id: groupId,
      patient_id: patient.id,
      reservation_id: dto.reservation_id ?? null,
      kind: dto.kind,
      title: dto.title?.trim() ?? '',
      file_name: fileName,
      content_type: file.mimetype,
      size: file.size,
      file_id: await this.store(fileName, file),
      uploaded_by_role: user.role,
      uploaded_by_id: user.id,
      uploaded_by_name: await this.nameOf(user),
    });

    const { file_id: _stored, ...row } = created.toJSON();
    return row;
  }

  private store(fileName: string, file: UploadedFileData): Promise<Types.ObjectId> {
    return new Promise((resolve, reject) => {
      const upload = this.bucket.openUploadStream(fileName, { metadata: { contentType: file.mimetype } });
      upload.once('finish', () => resolve(upload.id as Types.ObjectId));
      upload.once('error', reject);
      upload.end(file.buffer);
    });
  }

  /** An attachment the account may read, and a stream of its bytes. */
  async open(id: number, user: AuthUser) {
    const row = await this.attachments.findOne({ id, ...this.scope.groupFilter(user) }).lean();
    if (!row) {
      throw new NotFoundException('This file was not found');
    }
    return { row, stream: this.bucket.openDownloadStream(row.file_id) };
  }

  /** The owner removes any file; a doctor only the ones they added. */
  async remove(id: number, user: AuthUser) {
    const groupId = this.scope.ownGroupId(user);
    const row = await this.attachments.findOne({ id, group_id: groupId }).lean();
    if (!row) {
      throw new NotFoundException('This file was not found');
    }
    if (user.role === 'doctor' && !(row.uploaded_by_role === 'doctor' && row.uploaded_by_id === user.id)) {
      throw new ForbiddenException('Only the doctor who added this file, or the owner, can delete it');
    }

    await this.attachments.deleteOne({ id });
    await this.bucket.delete(row.file_id).catch(() => undefined);
    return { id };
  }

  /** Deletes the files of a patient, or of a whole group, being deleted. */
  async forget(filter: { patient_id: number } | { group_id: number }) {
    const rows = await this.attachments.find(filter).select('file_id').lean();
    await Promise.all(rows.map((row) => this.bucket.delete(row.file_id).catch(() => undefined)));
    await this.attachments.deleteMany(filter);
  }
}
