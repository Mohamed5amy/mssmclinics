import { Module } from '@nestjs/common';
import { ReceptionistsController } from './receptionists.controller';
import { ReceptionistsService } from './receptionists.service';

@Module({
  controllers: [ReceptionistsController],
  providers: [ReceptionistsService],
})
export class ReceptionistsModule {}
