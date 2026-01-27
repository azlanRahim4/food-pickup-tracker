import { IsEnum } from 'class-validator';
import { OrderStatus } from '../order-status';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
