import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './schemas/order.schema';
import { OrderStatus } from './order-status';
import { MenuItem } from '../menu/schemas/menu-item.schema';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(MenuItem.name) private menuModel: Model<MenuItem>,
  ) {}

  // Fill name/price and calculate total
  async create(dto: CreateOrderDto) {
    // Max 2 active orders per customer
    const activeCount = await this.orderModel.countDocuments({
      customerId: dto.customerId,
      status: {
        $in: [OrderStatus.Placed, OrderStatus.Preparing, OrderStatus.Ready],
      },
    });

    if (activeCount >= 2) {
      throw new BadRequestException('Customer already has 2 active orders.');
    }

    // Get all menu items needed (use unique ids to avoid mismatch when duplicates exist)
    const ids = dto.items.map((x) => x.menuItemId);
    const uniqueIds = Array.from(new Set(ids));

    // Optional: validate ObjectId format early (gives cleaner error than a cast error)
    for (const id of uniqueIds) {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException('One or more menu items not found.');
      }
    }

    const menuItems = await this.menuModel
      .find({ _id: { $in: uniqueIds } })
      .exec();

    // If any id is wrong, throw error
    if (menuItems.length !== uniqueIds.length) {
      throw new BadRequestException('One or more menu items not found.');
    }

    // Build a map (so we can find menu item fast)
    const map = new Map<string, any>(
      menuItems.map((m: any) => [m._id.toString(), m]),
    );

    // Check stock and reduce stock (AFTER map is built, BEFORE saving the order)

    // If the same menuItemId appears multiple times in dto.items, merge quantities first
    const qtyById = new Map<string, number>();
    for (const it of dto.items) {
      const key = it.menuItemId.toString();
      qtyById.set(key, (qtyById.get(key) ?? 0) + it.qty);
    }

    // Check stock
    for (const [id, requestedQty] of qtyById.entries()) {
      const menu = map.get(id);
      if (!menu) throw new BadRequestException('Menu item not found.');

      if (Number(menu.availableQty) < requestedQty) {
        throw new BadRequestException(
          `Not enough stock for ${menu.name}. Available ${menu.availableQty}, requested ${requestedQty}`,
        );
      }
    }

    // Reduce stock (atomic per item)
    for (const [id, requestedQty] of qtyById.entries()) {
      const result = await this.menuModel.updateOne(
        { _id: id, availableQty: { $gte: requestedQty } },
        { $inc: { availableQty: -requestedQty } },
      );

      if (result.modifiedCount !== 1) {
        throw new BadRequestException('Stock update failed. Try again.');
      }
    }

    // Build real order items + totalPrice
    let totalPrice = 0;

    const items = dto.items.map((it) => {
      const key = it.menuItemId.toString();
      const menu = map.get(key);

      if (!menu) {
        throw new BadRequestException('Menu item not found.');
      }

      const unitPrice = Number(menu.price) || 0;
      totalPrice += unitPrice * it.qty;

      return {
        menuItemId: it.menuItemId,
        name: menu.name,
        unitPrice,
        qty: it.qty,
      };
    });

    // Save the order
    return this.orderModel.create({
      customerId: dto.customerId,
      isPriority: dto.isPriority,
      status: OrderStatus.Placed,
      items,
      totalPrice,
    });
  }

  // Add a new service method to see ALL orders (for cron testing)
  async getAllOrders() {
    return this.orderModel.find().sort({ createdAt: -1 }).exec();
  }

  // Get all active orders
  async getActiveOrders() {
    return this.orderModel
      .find({
        status: {
          $in: [OrderStatus.Placed, OrderStatus.Preparing, OrderStatus.Ready],
        },
      })
      .sort({ isPriority: -1, createdAt: -1 })
      .exec();
  }

  // Add updateStatus logic
  async updateStatus(orderId: string, newStatus: OrderStatus) {
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new BadRequestException('Order not found.');
    }

    // Allowed status changes
    const allowed: Record<string, OrderStatus[]> = {
      Placed: [OrderStatus.Preparing, OrderStatus.Cancelled],
      Preparing: [OrderStatus.Ready, OrderStatus.Cancelled],
      Ready: [OrderStatus.PickedUp],
      PickedUp: [],
      Cancelled: [],
      Abandoned: [],
    };

    if (!allowed[order.status]?.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status change: ${order.status} -> ${newStatus}`,
      );
    }

    // Timestamp updates
    if (newStatus === OrderStatus.Ready) {
      order.readyAt = new Date();
    }

    if (newStatus === OrderStatus.PickedUp) {
      (order as any).pickedUpAt = new Date();
    }

    // If Cancelled: return stock
    if (newStatus === OrderStatus.Cancelled) {
      (order as any).cancelledAt = new Date();

      for (const it of order.items) {
        await this.menuModel.updateOne(
          { _id: it.menuItemId },
          { $inc: { availableQty: it.qty } },
        );
      }
    }

    order.status = newStatus;
    return order.save();
  }
}
