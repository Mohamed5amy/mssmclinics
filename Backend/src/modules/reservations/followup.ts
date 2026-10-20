import { FollowupRule } from '../groups/group.schema';
import { ReservationStatus } from './reservation.schema';

/**
 * The pricing half of the group's re-visit rule, and how a day's queue is
 * numbered, kept free of database access so the seed script prices and numbers
 * its demo visits the same way the API does.
 */

/**
 * The queue numbers (الدور) of one doctor's day at one branch, by appointment
 * time: the earliest slot is 1. Ties go to the earlier booking, visits with no
 * set time come after the timed ones, and canceled visits are numbered after
 * everyone still expected, so those keep consecutive numbers.
 */
export function queueNumbers(visits: Array<{ id: number; time?: string; status: string }>): Map<number, number> {
  const rank = (visit: { id: number; time?: string; status: string }) =>
    [visit.status === ReservationStatus.Canceled ? 1 : 0, visit.time || '99:99', visit.id] as const;
  const sorted = [...visits].sort((a, b) => {
    const [x, y] = [rank(a), rank(b)];
    return x[0] - y[0] || x[1].localeCompare(y[1]) || x[2] - y[2];
  });
  return new Map(sorted.map((visit, i) => [visit.id, i + 1]));
}

/** Whether booking this service can count as a follow-up under the group's rule. */
export function followupApplies(rule: Partial<FollowupRule> | undefined, serviceId: number): boolean {
  return !!rule?.enabled && rule.days > 0 && (rule.service_ids ?? []).includes(serviceId);
}

/** What a follow-up visit costs, given the service's full price. */
export function followupPrice(rule: Partial<FollowupRule>, fullPrice: number): number {
  switch (rule.mode) {
    case 'percent':
      return Math.round((fullPrice * Math.min(rule.value ?? 0, 100)) / 100);
    case 'fixed':
      return Math.min(rule.value ?? 0, fullPrice);
    default:
      return 0;
  }
}
