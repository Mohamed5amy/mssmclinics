import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Matches } from 'class-validator';
import { ACTIVITY_CATEGORIES } from '../activity.schema';

/** `activity-log`: newest first, a page at a time (`before` = the last id of the previous page). */
export class ActivityQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() group_id?: number;
  @IsOptional() @IsIn(ACTIVITY_CATEGORIES) category?: string;
  @IsOptional() @IsIn(['create', 'update', 'delete', 'action', 'login', 'login_failed']) action?: string;
  /** `role:id`, e.g. `receptionist:3`. */
  @IsOptional() @IsString() @Matches(/^[a-z]+:\d+$/) actor?: string;
  @IsOptional() @IsDateString() start?: string;
  @IsOptional() @IsDateString() end?: string;
  @IsOptional() @Type(() => Number) @IsInt() before?: number;
}
