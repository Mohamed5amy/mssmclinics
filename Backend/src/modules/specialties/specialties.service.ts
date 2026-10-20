import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CatalogService } from '../../common/catalog.service';
import { CountersService } from '../../counters/counters.service';
import { Specialty } from './specialty.schema';

@Injectable()
export class SpecialtiesService extends CatalogService<Specialty> {
  constructor(
    @InjectModel(Specialty.name) model: Model<Specialty>,
    counters: CountersService,
  ) {
    super(model, counters, 'specialty');
  }
}
