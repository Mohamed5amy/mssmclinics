import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

/**
 * `?group_id=&clinic_id=` - the dashboard's group and branch dropdowns. The
 * group filter is the platform owner's; values outside an account's reach
 * simply return nothing.
 */
export class ScopeQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() group_id?: number;
  @IsOptional() @Type(() => Number) @IsInt() clinic_id?: number;
}
