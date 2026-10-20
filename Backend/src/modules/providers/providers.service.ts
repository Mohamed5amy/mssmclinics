import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CatalogService } from '../../common/catalog.service';
import { CountersService } from '../../counters/counters.service';
import { Provider } from './provider.schema';

@Injectable()
export class ProvidersService extends CatalogService<Provider> {
  constructor(
    @InjectModel(Provider.name) model: Model<Provider>,
    counters: CountersService,
  ) {
    super(model, counters, 'provider');
  }
}
