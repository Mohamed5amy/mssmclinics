import { Global, Module } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { LookupsService } from './lookups.service';
import { ScopeService } from './scope.service';

@Global()
@Module({
  providers: [LookupsService, ScopeService, AccountsService],
  exports: [LookupsService, ScopeService, AccountsService],
})
export class LookupsModule {}
