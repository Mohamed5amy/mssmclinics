import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Counter } from './counter.schema';

/**
 * Hands out sequential numeric ids, one sequence per collection.
 * `$inc` inside findOneAndUpdate is atomic, so concurrent inserts never collide.
 */
@Injectable()
export class CountersService {
  constructor(@InjectModel(Counter.name) private readonly model: Model<Counter>) {}

  async next(name: string): Promise<number> {
    const counter = await this.model.findOneAndUpdate(
      { name },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    return counter.seq;
  }

  /** Used by the seed script after it wipes the database. */
  async reset(name: string): Promise<void> {
    await this.model.updateOne({ name }, { $set: { seq: 0 } }, { upsert: true });
  }
}
