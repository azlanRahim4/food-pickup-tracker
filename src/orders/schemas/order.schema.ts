import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { OrderStatus } from '../order-status';

@Schema({ timestamps: true })
export class OrderItem {
  @Prop({ required: true })
  menuItemId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  unitPrice: number;

  @Prop({ required: true })
  qty: number;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true })
  customerId: string;

  @Prop({ required: true })
  isPriority: boolean;

  @Prop({ required: true })
  status: OrderStatus;

  @Prop({ required: true, type: [OrderItemSchema] })
  items: OrderItem[];

  @Prop({ required: true })
  totalPrice: number;

  @Prop()
  readyAt?: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
