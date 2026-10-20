import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../common/schema/base-schema';

export type ReservationDocument = HydratedDocument<Reservation>;

/**
 * The three values the dashboard's status dropdown sends, stored as-is because
 * the pages compare against the Arabic text (`status == "مكتمل"`).
 */
export const ReservationStatus = {
  Pending: 'فى الانتظار',
  Completed: 'مكتمل',
  Canceled: 'ملغي',
} as const;

export const RESERVATION_STATUSES: string[] = Object.values(ReservationStatus);

/** Booked ahead (by phone, for a chosen day) or walked in off the street today. */
export const BookingType = {
  Booked: 'booked',
  WalkIn: 'walk_in',
} as const;

export const BOOKING_TYPES: string[] = Object.values(BookingType);

/** Recorded by hand at the desk - there is no online payment integration. */
export const PAYMENT_METHODS = ['cash', 'instapay', 'vodafone_cash', 'card'];

/** One amount taken towards a visit. A visit may be paid in parts, on different days. */
@Schema({ _id: false, versionKey: false })
export class Payment {
  @Prop({ required: true })
  id: number;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ required: true, enum: PAYMENT_METHODS })
  method: string;

  @Prop({ required: true })
  paid_at: Date;

  /** Who took it: `owner` or `receptionist` (staff), and that account's id. */
  @Prop({ required: true })
  recorded_by_role: string;

  @Prop({ required: true })
  recorded_by_id: number;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

@Schema({ collection: 'reservations', ...baseSchemaOptions })
export class Reservation {
  @Prop({ required: true, unique: true, index: true })
  id: number;

  @Prop({ required: true, index: true })
  patient_id: number;

  @Prop({ required: true, index: true })
  doctor_id: number;

  /** The group the visit belongs to - patients, prices and the re-visit rule are group-wide. */
  @Prop({ required: true, index: true })
  group_id: number;

  /** The branch the visit is at; its queue is per branch, doctor and day. */
  @Prop({ required: true, index: true })
  clinic_id: number;

  @Prop({ required: true, index: true })
  service_id: number;

  /**
   * What this visit is charged before any discount: the service price, or the
   * follow-up price when the clinic's re-visit rule applied. A snapshot, so later
   * price edits don't rewrite history.
   */
  @Prop({ required: true, min: 0 })
  price: number;

  /** Snapshot of the service's full price, kept so a follow-up can show what it saved. */
  @Prop({ min: 0 })
  service_price: number;

  /** Snapshot of the doctor's percentage, for the same reason. */
  @Prop({ required: true, min: 0, max: 100 })
  doctor_prectange: number;

  /** The day (and time, when one was given) the visit is booked for. */
  @Prop({ required: true, index: true })
  date: Date;

  /** "HH:mm", or empty for a booking made for a day without a set time. */
  @Prop({ default: '' })
  time: string;

  @Prop({ enum: BOOKING_TYPES, default: BookingType.WalkIn })
  booking_type: string;

  /** The patient's turn (الدور) in the doctor's queue for that day, from 1. */
  @Prop({ index: true })
  queue_number: number;

  /**
   * Booked outside the doctor's hours, or into a slot already taken, by the
   * group's owner on purpose. Such visits hold no slot.
   */
  @Prop({ default: false })
  outside_hours: boolean;

  /** When the patient checked in at the desk. Walk-ins arrive when they're booked. */
  @Prop({ type: Date, default: null })
  arrived_at: Date | null;

  /** When the doctor called the patient in with "next patient". */
  @Prop({ type: Date, default: null })
  called_at: Date | null;

  /** Whether the clinic's re-visit rule priced this visit. */
  @Prop({ default: false })
  is_followup: boolean;

  /** The full visit this one follows up on. */
  @Prop({ type: Number, default: null })
  followup_of: number | null;

  /** The desk chose to charge full price although the re-visit rule applied. */
  @Prop({ default: false })
  followup_waived: boolean;

  /** Taken off `price`, in EGP. */
  @Prop({ default: 0, min: 0 })
  discount: number;

  @Prop({ type: [PaymentSchema], default: [] })
  payments: Payment[];

  @Prop({ default: '' })
  Diagnosis: string;

  @Prop({
    required: true,
    enum: RESERVATION_STATUSES,
    default: ReservationStatus.Pending,
    index: true,
  })
  status: string;
}

export const ReservationSchema = SchemaFactory.createForClass(Reservation);

ReservationSchema.index({ group_id: 1, date: 1 });
ReservationSchema.index({ clinic_id: 1, doctor_id: 1, date: 1 });
ReservationSchema.index({ patient_id: 1, doctor_id: 1, date: 1 });
