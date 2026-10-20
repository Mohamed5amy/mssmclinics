import { Global, Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';

/** Global: sign-ins are logged from AuthService, changes by the interceptor (see AppModule). */
@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditInterceptor],
  exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}
