import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMenuItemDto, UpdateMenuItemDto } from './dtos';
import { Country, Role } from '@prisma/client';

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  // ✅ CREATE MENU ITEM
  async create(dto: CreateMenuItemDto, role: Role, country: Country) {
    const { name, price, restaurantId } = dto;

    // Check if restaurant exists
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      throw new BadRequestException('Restaurant not found');
    }
    if (role === 'MANAGER' && country !== restaurant.country) {
      throw new UnauthorizedException(
        "can't add item for another country as a manager",
      );
    }

    // Create menu item
    const menuItem = await this.prisma.menuItem.create({
      data: {
        name,
        price,
        restaurantId,
      },
      include: {
        restaurant: {
          select: { id: true, name: true, country: true },
        },
      },
    });

    return menuItem;
  }

  // ✅ GET ALL MENU ITEMS (with pagination & optional restaurant filter)
  async findAll(params: {
    restaurantId?: string;
    page?: number;
    limit?: number;
  }) {
    const { restaurantId, page = 1, limit = 10 } = params;

    const skip = (page - 1) * limit;
    const where = restaurantId ? { restaurantId } : {};

    const [data, total] = await Promise.all([
      this.prisma.menuItem.findMany({
        where,
        skip,
        take: limit,
        include: {
          restaurant: {
            select: { id: true, name: true, country: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.menuItem.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  // ✅ (Optional) UPDATE MENU ITEM
  async update(id: string, dto: UpdateMenuItemDto) {
    const menuItem = await this.prisma.menuItem.update({
      where: { id },
      data: dto,
      include: {
        restaurant: {
          select: { id: true, name: true, country: true },
        },
      },
    });

    return menuItem;
  }

  // ✅ (Optional) DELETE MENU ITEM
  async remove(id: string) {
    await this.prisma.menuItem.delete({
      where: { id },
    });
    return { message: 'Menu item deleted successfully' };
  }
}
