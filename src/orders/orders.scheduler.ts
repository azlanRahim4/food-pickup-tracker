import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';

import { Order } from './schemas/order.schema';
import { OrderStatus } from './order-status';
import { MenuItem } from '../menu/schemas/menu-item.schema';

@Injectable()
export class OrdersScheduler {
  constructor(
    private readonly config: ConfigService,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(MenuItem.name) private menuModel: Model<MenuItem>,
  ) {}

  // runs every minute
  @Cron('* * * * *')
  async autoAbandonReadyOrders() {
    const minutes = Number(this.config.get('ABANDON_AFTER_MINUTES') ?? 30);

    const cutoff = new Date(Date.now() - minutes * 60 * 1000);

    const expired = await this.orderModel.find({
      status: OrderStatus.Ready,
      readyAt: { $lte: cutoff },
    });

    for (const order of expired) {
      // mark as Abandoned
      (order as any).abandonedAt = new Date();
      order.status = OrderStatus.Abandoned;
      await order.save();

      // restore stock
      for (const it of order.items) {
        await this.menuModel.updateOne(
          { _id: it.menuItemId },
          { $inc: { availableQty: it.qty } },
        );
      }
    }
  }
}
