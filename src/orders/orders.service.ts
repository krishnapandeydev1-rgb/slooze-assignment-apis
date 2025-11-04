import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

import { Country, OrderStatus, Role } from '@prisma/client';
import { CreateOrderDto, UpdateOrderStatusDto } from './dtos';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create new order
   * - MEMBER can create orders only for their own country
   * - Validates restaurant and menu items
   */
  async create(
    dto: CreateOrderDto,
    user: { sub: string; role: Role; country: Country },
  ) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: dto.restaurantId },
      include: { menuItems: true },
    });

    if (!restaurant) throw new NotFoundException('Restaurant not found');
    if (restaurant.country !== user.country && user.role !== 'ADMIN')
      throw new ForbiddenException('Cannot order from another country');

    if (!dto.items || dto.items.length === 0)
      throw new BadRequestException('At least one menu item required');

    // Validate all items exist in restaurant
    const validItems = dto.items.map((item) =>
      restaurant.menuItems.find((m) => m.id === item.menuItemId),
    );

    if (validItems.some((v) => !v))
      throw new BadRequestException('Invalid menu item for this restaurant');

    const totalAmount = dto.items.reduce((sum, item) => {
      const menuItem = restaurant.menuItems.find(
        (m) => m.id === item.menuItemId,
      );
      return sum + menuItem!.price * item.quantity;
    }, 0);
    console.log({ country: user.country });
    const order = await this.prisma.order.create({
      data: {
        userId: user.sub,
        restaurantId: dto.restaurantId,
        country: user.country,
        totalAmount,
        status: OrderStatus.PENDING,
        items: {
          create: dto.items.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            price:
              restaurant?.menuItems?.find((m) => m!.id === item.menuItemId)
                ?.price || 0,
          })),
        },
      },
      include: {
        restaurant: true,
        items: { include: { menuItem: true } },
      },
    });

    return order;
  }

  /**
   * Get all orders
   * - ADMIN → all
   * - MANAGER → all orders in own country
   * - MEMBER → only their own orders
   */
  async findAll(user: { sub: string; role: Role; country: Country }) {
    let where: any = {};
    if (user.role === 'MANAGER') where = { country: user.country };
    else if (user.role === 'MEMBER') where = { userId: user.sub };

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        user: { select: { name: true, email: true, country: true } },
        restaurant: true,
        items: { include: { menuItem: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders;
  }

  /**
   * Get single order by ID
   */
  async findOne(
    id: string,
    user: { sub: string; role: Role; country: Country },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, country: true } },
        restaurant: true,
        items: { include: { menuItem: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    if (user.role === 'MEMBER' && order.userId !== user.sub)
      throw new ForbiddenException('Cannot view others’ orders');
    if (user.role === 'MANAGER' && order.country !== user.country)
      throw new ForbiddenException('Cannot view orders from another country');

    return order;
  }

  /**
   * Update order status (Admin / Manager)
   */
  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
    user: { role: Role; country: Country },
  ) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    if (user.role === 'MEMBER')
      throw new ForbiddenException('Members cannot update order status');
    if (user.role === 'MANAGER' && order.country !== user.country)
      throw new ForbiddenException('Cannot update orders from another country');

    return this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  /**
   * Cancel an order (User)
   */
  async cancel(id: string, user: { sub: string; role: Role }) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    if (user.role === 'MEMBER' && order.userId !== user.sub)
      throw new ForbiddenException('Cannot cancel someone else’s order');

    if (order.status === OrderStatus.PAID)
      throw new BadRequestException('Paid orders cannot be cancelled');

    return this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED },
    });
  }
}
