import { ConflictException, NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
import { CountersService } from '../counters/counters.service';
import { GroupFilter } from '../database/scope.service';

/**
 * Specialties and providers are the same thing behind different labels:
 * an id and a title, owned by one group, listed, created and deleted.
 * This holds that shared logic.
 */
export abstract class CatalogService<T extends { id: number; title: string; group_id: number }> {
  protected constructor(
    protected readonly model: Model<T>,
    protected readonly counters: CountersService,
    /** Counter sequence name, also used in the "already exists" message. */
    protected readonly sequence: string,
  ) {}

  async findAll(scope: GroupFilter) {
    return this.model.find(scope as never).sort({ id: 1 }).lean();
  }

  async create(title: string, groupId: number) {
    const exists = await this.model.findOne({ title, group_id: groupId } as never);
    if (exists) {
      throw new ConflictException(`This ${this.sequence} already exists`);
    }

    const id = await this.counters.next(this.sequence);
    const created = new this.model({ id, title, group_id: groupId } as never);
    await created.save();
    return created.toJSON();
  }

  async remove(id: number, groupId: number) {
    const deleted = await this.model.findOneAndDelete({ id, group_id: groupId } as never);
    if (!deleted) {
      throw new NotFoundException(`This ${this.sequence} was not found`);
    }
    return { id };
  }
}
