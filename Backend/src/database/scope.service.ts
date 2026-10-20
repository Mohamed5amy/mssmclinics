import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthUser } from '../common/auth-user';
import { Clinic, ClinicStatus } from '../modules/clinics/clinic.schema';

/** Mongo filter on a record's `group_id`. */
export type GroupFilter = { group_id?: number | { $in: number[] } };

/** Mongo filter on a branch-level record: its group, and for some accounts its branch. */
export type ClinicFilter = GroupFilter & { clinic_id?: number | { $in: number[] } };

const NOTHING = { $in: [] as number[] };

/**
 * Tenant isolation. Every list and every single-record read or write goes
 * through here, so one group's data never leaks into another's:
 *
 *   platform owner -> every group (read-only, enforced by RolesGuard)
 *   group owner    -> its group, every branch
 *   receptionist   -> its group; its one branch for branch-level records
 *   doctor         -> its group; its branches for branch-level records
 *
 * Group-wide records (patients, doctors, staff, the price list) use
 * `groupFilter`; records that happen at a branch (visits) use `clinicFilter`.
 * Records outside an account's reach answer "not found", so their existence
 * isn't revealed either.
 *
 * The account's group and branches come from AccountsService, loaded fresh on
 * every request, so these filters need no lookups of their own.
 */
@Injectable()
export class ScopeService {
  constructor(@InjectModel(Clinic.name) private readonly clinics: Model<Clinic>) {}

  /** Records of the account's group; the platform owner may narrow to one group. */
  groupFilter(user: AuthUser, requested?: number): GroupFilter {
    if (user.group_id === null) {
      return requested ? { group_id: requested } : {};
    }
    if (requested && requested !== user.group_id) {
      return { group_id: NOTHING };
    }
    return { group_id: user.group_id };
  }

  /** Branch-level records, optionally narrowed to one branch (the dashboard's branch dropdown). */
  clinicFilter(user: AuthUser, requestedClinic?: number, requestedGroup?: number): ClinicFilter {
    const filter: ClinicFilter = this.groupFilter(user, requestedGroup);

    if (user.clinic_ids) {
      filter.clinic_id = requestedClinic
        ? user.clinic_ids.includes(requestedClinic) ? requestedClinic : NOTHING
        : { $in: user.clinic_ids };
    } else if (requestedClinic) {
      filter.clinic_id = requestedClinic;
    }
    return filter;
  }

  /** The branches themselves (whose own id is `id`, not `clinic_id`). */
  branchFilter(user: AuthUser, requestedGroup?: number): GroupFilter & { id?: { $in: number[] } } {
    return {
      ...this.groupFilter(user, requestedGroup),
      ...(user.clinic_ids ? { id: { $in: user.clinic_ids } } : {}),
    };
  }

  /** Whether a branch is within the account's reach. */
  canReachClinic(user: AuthUser, clinic: { id: number; group_id: number }): boolean {
    if (user.group_id !== null && clinic.group_id !== user.group_id) return false;
    return !user.clinic_ids || user.clinic_ids.includes(clinic.id);
  }

  /** The group a group member writes into. The platform owner never writes inside a group. */
  ownGroupId(user: AuthUser): number {
    if (user.group_id === null) {
      throw new ForbiddenException('You are not allowed to perform this action');
    }
    return user.group_id;
  }

  /**
   * The branch a front-desk action (booking, check-in, registering a patient)
   * happens at. A receptionist's is fixed; an owner names one, unless the group
   * has a single open branch. A branch outside the account's reach, or closed,
   * is refused as if no branch was chosen.
   */
  async actingClinicId(user: AuthUser, requested?: number): Promise<number> {
    const groupId = this.ownGroupId(user);
    const open = await this.clinics
      .find({ group_id: groupId, status: ClinicStatus.Active, ...(user.clinic_ids ? { id: { $in: user.clinic_ids } } : {}) })
      .select('id')
      .lean();
    const ids = open.map((clinic) => clinic.id);

    if (requested ? ids.includes(requested) : ids.length === 1) {
      return requested ?? ids[0];
    }
    throw new BadRequestException({
      message: 'Please choose a branch',
      errors: { clinic_id: ['Please choose a branch'] },
    });
  }
}
