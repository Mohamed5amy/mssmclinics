import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { baseSchemaOptions } from '../../common/schema/base-schema';

export type GroupDocument = HydratedDocument<Group>;

export const GroupStatus = { Active: 'active', Suspended: 'suspended' } as const;
export const GROUP_STATUSES: string[] = Object.values(GroupStatus);

/** How a follow-up visit is priced: free, a percentage of the full price, or a fixed amount. */
export const FOLLOWUP_MODES = ['free', 'percent', 'fixed'];

/**
 * The group's re-visit rule (الإعادة / الاستشارة): coming back to the same doctor
 * within `days` of a full visit (كشف) costs less, or nothing - at any branch.
 */
@Schema({ _id: false, versionKey: false })
export class FollowupRule {
  /** Off until the owner turns it on from the settings page. */
  @Prop({ default: false })
  enabled: boolean;

  /** Re-visits up to this many days after the full visit qualify. */
  @Prop({ default: 14, min: 1, max: 365 })
  days: number;

  @Prop({ enum: FOLLOWUP_MODES, default: 'free' })
  mode: string;

  /** The percentage charged for `percent`, the amount in EGP for `fixed`; unused for `free`. */
  @Prop({ default: 0, min: 0 })
  value: number;

  /** The services that count as a full visit and get the follow-up price on a re-visit. */
  @Prop({ type: [Number], default: [] })
  service_ids: number[];
}

export const FollowupRuleSchema = SchemaFactory.createForClass(FollowupRule);

/**
 * A tenant (مجموعة): a company or practice that runs one or more branches.
 * Everything it owns carries its `group_id`. The platform owner creates groups
 * and can suspend them, which locks out everyone in the group at once.
 */
@Schema({ collection: 'groups', ...baseSchemaOptions })
export class Group {
  @Prop({ required: true, unique: true, index: true })
  id: number;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: '', trim: true })
  phone: string;

  @Prop({ enum: GROUP_STATUSES, default: GroupStatus.Active, index: true })
  status: string;

  /** One price list for every branch, so one re-visit rule too. */
  @Prop({ type: FollowupRuleSchema, default: () => ({}) })
  followup: FollowupRule;
}

export const GroupSchema = SchemaFactory.createForClass(Group);
