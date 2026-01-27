import { Body, Controller, Get, Post, Patch, Param } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @Get()
  getActive() {
    return this.ordersService.getActiveOrders();
  }

  // Debug endpoint: shows all orders (including PickedUp/Cancelled/Abandoned)

  @Get('all')
  getAll() {
    return this.ordersService.getAllOrders();
  }

  // Add PATCH route in controller
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto.status);
  }
}
