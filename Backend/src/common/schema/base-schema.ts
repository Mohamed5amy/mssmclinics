import { SchemaOptions } from '@nestjs/mongoose';

/**
 * Shared schema options for every collection.
 *
 * - Mongo's ObjectId stays internal; the API exposes the numeric `id` that the
 *   dashboard expects (it does `+item.id` and compares ids as numbers).
 * - Timestamps are named `created_at` / `updated_at` because the patient profile
 *   page reads `created_at` directly.
 */
export const baseSchemaOptions: SchemaOptions = {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret: Record<string, unknown>) => {
      delete ret._id;
      delete ret.password;
      return ret;
    },
  },
  toObject: { virtuals: true },
};
