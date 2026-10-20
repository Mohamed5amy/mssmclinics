import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/** How long failed sign-ins count, and how many lock the email for that long. */
export const ATTEMPT_WINDOW_MINUTES = 15;
export const MAX_FAILED_ATTEMPTS = 5;

/**
 * One failed sign-in for an email. MongoDB deletes them after the window
 * (a TTL index), and a successful sign-in clears the email's.
 */
@Schema({ collection: 'login_attempts', versionKey: false })
export class LoginAttempt {
  @Prop({ required: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ default: '' })
  ip: string;

  @Prop({ type: Date, default: Date.now, expires: ATTEMPT_WINDOW_MINUTES * 60 })
  at: Date;
}

export const LoginAttemptSchema = SchemaFactory.createForClass(LoginAttempt);
