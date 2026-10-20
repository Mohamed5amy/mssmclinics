import { Module } from '@nestjs/common';
import { MedicalModule } from '../medical/medical.module';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  imports: [MedicalModule],
  controllers: [GroupsController],
  providers: [GroupsService],
})
export class GroupsModule {}
