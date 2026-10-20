import { BadRequestException, ValidationError, ValidationPipe } from '@nestjs/common';

/** Collapses class-validator output into Laravel's `{ field: ["msg"] }` map. */
function toErrorMap(errors: ValidationError[], parent = ''): Record<string, string[]> {
  return errors.reduce<Record<string, string[]>>((acc, error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;

    if (error.constraints) {
      acc[field] = Object.values(error.constraints);
    }
    if (error.children?.length) {
      Object.assign(acc, toErrorMap(error.children, field));
    }
    return acc;
  }, {});
}

export const validationPipe = new ValidationPipe({
  whitelist: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
  exceptionFactory: (errors) => {
    const map = toErrorMap(errors);
    const first = Object.values(map)[0]?.[0] ?? 'Validation failed';
    return new BadRequestException({ message: first, errors: map });
  },
});
