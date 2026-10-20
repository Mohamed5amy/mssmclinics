import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CountersService } from '../../counters/counters.service';
import { GroupFilter } from '../../database/scope.service';
import { Group } from '../groups/group.schema';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';
import { Service } from './service.schema';

@Injectable()
export class ServicesService {
  constructor(
    @InjectModel(Service.name) private readonly model: Model<Service>,
    @InjectModel(Group.name) private readonly groups: Model<Group>,
    private readonly counters: CountersService,
  ) {}

  findAll(scope: GroupFilter) {
    return this.model.find(scope).sort({ id: 1 }).lean();
  }

  async create(dto: CreateServiceDto, groupId: number) {
    if (await this.model.exists({ name: dto.name, group_id: groupId })) {
      throw new ConflictException('This service already exists');
    }

    const id = await this.counters.next('service');
    const created = await this.model.create({ ...dto, id, group_id: groupId });
    return created.toJSON();
  }

  /**
   * Renaming or repricing a service leaves past reservations alone - each one
   * stored its own price snapshot when it was created.
   */
  async update({ id, ...changes }: UpdateServiceDto, groupId: number) {
    const updated = await this.model.findOneAndUpdate(
      { id, group_id: groupId },
      { $set: changes },
      { new: true },
    );
    if (!updated) {
      throw new NotFoundException('This service was not found');
    }
    return updated.toJSON();
  }

  /** A deleted service also stops counting as a full visit for the re-visit rule. */
  async remove(id: number, groupId: number) {
    const deleted = await this.model.findOneAndDelete({ id, group_id: groupId });
    if (!deleted) {
      throw new NotFoundException('This service was not found');
    }
    await this.groups.updateOne({ id: groupId }, { $pull: { 'followup.service_ids': id } });
    return { id };
  }
}
