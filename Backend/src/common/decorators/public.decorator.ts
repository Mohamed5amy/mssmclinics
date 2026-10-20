import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';

/** Skips the global JWT guard - used by the three login routes. */
export const Public = () => SetMetadata(IS_PUBLIC, true);
