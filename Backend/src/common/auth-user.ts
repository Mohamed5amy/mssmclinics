/**
 * Who signs in:
 *   admin        - the platform owner. Sees every group, but only manages groups.
 *   owner        - a group's owner. Runs its branches, doctors, staff, prices and settings.
 *   receptionist - a branch's front desk. Patients, bookings, the queue and payments.
 *   doctor       - works in one or more branches of a group.
 */
export type Role = 'admin' | 'owner' | 'receptionist' | 'doctor';

/** What a route may require. */
export type Access = Role;

/** What the signed token carries: who it is, nothing about where they belong. */
export interface TokenPayload {
  id: number;
  email: string;
  role: Role;
}

/**
 * The signed-in account, loaded fresh on every request by the JWT guard, so a
 * suspended group, a moved receptionist or a deleted account takes effect at once.
 */
export interface AuthUser {
  id: number;
  email: string;
  role: Role;
  /** The group the account belongs to; null for the platform owner. */
  group_id: number | null;
  /**
   * The branches the account works in. Null means every branch it can see:
   * the platform owner (all groups) and a group owner (all of its group).
   */
  clinic_ids: number[] | null;
}
