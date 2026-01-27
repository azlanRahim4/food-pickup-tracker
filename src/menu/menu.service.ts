import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MenuItem } from './schemas/menu-item.schema';

@Injectable()
export class MenuService {
  constructor(
    @InjectModel(MenuItem.name) private menuModel: Model<MenuItem>,
  ) {}

  async getAll() {
    return this.menuModel.find();
  }

  async upsert(dto: { name: string; price: number; availableQty: number }) {
  const name = dto.name.trim();

  const updatedOrCreated = await this.menuModel.findOneAndUpdate(
    { name }, // find by name
    { $set: { price: dto.price, availableQty: dto.availableQty, name } }, // update values
    { upsert: true, new: true } // if not found create it, and return the latest version
  );

  return updatedOrCreated;
}

}
