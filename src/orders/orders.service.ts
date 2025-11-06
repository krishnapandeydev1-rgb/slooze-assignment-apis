import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Country, OrderStatus, PaymentType, Role } from '@prisma/client';
import { CreateOrderDto, UpdateOrderStatusDto } from './dtos';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  /**
   * ✅ Create new order (secure: backend computes all prices)
   */
  async create(
    dto: CreateOrderDto,
    user: { sub: string; role: Role; country: Country },
  ) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one menu item is required');
    }

    // Collect all menu item IDs from the request
    const menuItemIds = dto.items.map((i) => i.menuItemId);

    // Fetch all relevant menu items in a single query
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
      include: { restaurant: true },
    });

    if (menuItems.length !== dto.items.length) {
      throw new NotFoundException('Some menu items were not found');
    }

    // Validate and compute total securely
    let totalAmount = 0;
    const orderItemsData = dto.items.map((item) => {
      const menuItem = menuItems.find((m) => m.id === item.menuItemId);
      if (!menuItem)
        throw new NotFoundException(`Menu item not found: ${item.menuItemId}`);

      // Restrict cross-country orders (except for admin)
      if (menuItem.restaurant.country !== user.country && user.role !== 'ADMIN')
        throw new ForbiddenException(
          'Cannot order from a restaurant in another country',
        );

      const itemTotal = menuItem.price * item.quantity;
      totalAmount += itemTotal;

      return {
        menuItemId: menuItem.id,
        quantity: item.quantity,
        price: menuItem.price,
      };
    });

    // ✅ Create order + payment atomically
    const [order] = await this.prisma.$transaction([
      this.prisma.order.create({
        data: {
          userId: user.sub,
          country: user.country,
          totalAmount,
          status: OrderStatus.PENDING,
          items: {
            create: orderItemsData,
          },
        },
      }),
    ]);

    // ✅ Create payment method linked to this order
    await this.prisma.paymentMethod.create({
      data: {
        orderId: order.id,
        type: dto.payment.type,
        details: dto.payment.details ?? {},
      },
    });

    // ✅ Return order with items + payment info
    const fullOrder = await this.prisma.order.findUnique({
      where: { id: order.id },
      include: {
        items: {
          include: {
            menuItem: { include: { restaurant: true } },
          },
        },
      },
    });

    return fullOrder;
  }

  /**
   * Get all orders (role-based access)
   */
  async findAll(user: { sub: string; role: Role; country: Country }) {
    let where: any = {};
    if (user.role === 'MANAGER') where = { country: user.country };
    else if (user.role === 'MEMBER') where = { userId: user.sub };

    return this.prisma.order.findMany({
      where,
      include: {
        user: { select: { name: true, email: true, country: true } },
        items: {
          include: {
            menuItem: { include: { restaurant: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get single order
   */
  async findOne(
    id: string,
    user: { sub: string; role: Role; country: Country },
  ) {
    let where: any = {};
    if (user.role === 'MANAGER') where = { country: user.country };
    else if (user.role === 'MEMBER') where = { userId: user.sub };
    const order = await this.prisma.order.findUnique({
      where,
      include: {
        user: { select: { id: true, name: true, country: true } },
        items: {
          include: { menuItem: { include: { restaurant: true } } },
        },
        paymentMethod: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');

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

    if (user.role === 'MANAGER' && order.country !== user.country)
      throw new ForbiddenException('Cannot update orders from another country');

    return this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  /**
   * Cancel an order
   */
  async cancel(
    id: string,
    user: { sub: string; role: Role; country: Country },
  ) {
    const where: any = {
      id,
    };
    if (user.role === 'MANAGER') {
      where['country'] = user.country;
    }
    const order = await this.prisma.order.findUnique({ where });
    if (!order) throw new NotFoundException('Order not found');

    if (order.status === OrderStatus.PAID)
      throw new BadRequestException('Paid orders cannot be cancelled');

    return this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED },
    });
  }

  async payNow(
    orderId: string,
    dto: { type: PaymentType; details: any },
    user: { sub: string; role: Role },
  ) {
    if (!dto.type) {
      throw new BadRequestException('please mention payemnt type');
    }
    return this.prisma.$transaction(async (tx) => {
      // 🔹 Step 1: Fetch order inside transaction
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { paymentMethod: true },
      });

      if (!order) throw new NotFoundException('Order not found');

      // 🔹 Step 2: Access control
      if (order.userId !== user.sub && user.role !== 'MEMBER') {
        throw new ForbiddenException(
          'You are not authorized to pay for this order',
        );
      }

      // 🔹 Step 3: Check status
      if (order.status === 'PAID') {
        throw new BadRequestException('This order is already paid');
      }
      if (order.status === 'CANCELLED') {
        throw new BadRequestException('Cannot pay for a cancelled order');
      }

      // 🔹 Step 4: Validate type
      const validTypes = ['CASH', 'UPI', 'CARD', 'NETBANKING'];
      if (!validTypes.includes(dto.type)) {
        throw new BadRequestException('Invalid payment type');
      }

      // 🔹 Step 5: Validate details based on type
      switch (dto.type) {
        case 'CASH':
          dto.details = {};
          break;

        case 'UPI':
          if (!dto.details?.upiId) {
            throw new BadRequestException('UPI payment requires upiId');
          }
          break;

        case 'CARD':
          if (!dto.details?.cardNumber) {
            throw new BadRequestException(
              'Card payment requires cardNumber and cardHolder',
            );
          }
          dto.details.cardNumber = dto.details.cardNumber.replace(
            /\d{12}(\d{4})/,
            '************$1',
          );
          break;

        case 'NETBANKING':
          if (!dto.details?.bankName) {
            throw new BadRequestException(
              'Netbanking requires bankName and transactionId',
            );
          }
          break;
      }

      // 🔹 Step 6: Update or create payment method
      if (order.paymentMethod) {
        await tx.paymentMethod.update({
          where: { id: order.paymentMethod.id },
          data: {
            type: dto.type,
            details: dto.details,
          },
        });
      } else {
        await tx.paymentMethod.create({
          data: {
            orderId: order.id,
            type: dto.type,
            details: dto.details,
          },
        });
      }

      // 🔹 Step 7: Update order status to PAID
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: 'PAID' },
        include: {
          items: {
            include: {
              menuItem: { include: { restaurant: true } },
            },
          },
          paymentMethod: true,
          user: true,
        },
      });

      // ✅ Step 8: Return updated order
      return updatedOrder;
    });
  }
}
