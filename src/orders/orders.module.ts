import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersScheduler } from './orders.scheduler';
import { Order, OrderSchema } from './schemas/order.schema';
import { MenuItem, MenuItemSchema } from '../menu/schemas/menu-item.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: MenuItem.name, schema: MenuItemSchema }, // Added so Orders can access MenuItems
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersScheduler],
})
export class OrdersModule {}
