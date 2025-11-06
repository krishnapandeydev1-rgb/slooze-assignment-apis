import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Country, Role } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRestaurantDto, UpdateRestaurantDto } from './dtos';
@Injectable()
export class RestaurantsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all restaurants (visible to all roles)
   * - Admin → all
   * - Manager/Member → only from their country
   */
  async findAll(user: { role: Role; country: string }, page = 1, limit = 10) {
    // 👇 Ensure numeric and sane values
    const take = Math.max(1, Math.min(limit, 100)); // limit max 100
    const skip = (Math.max(page, 1) - 1) * take;

    const where: { country?: Country } =
      user.role === 'ADMIN' ? {} : { country: user.country as Country };

    // 👇 Fetch paginated data
    const [restaurants, total] = await this.prisma.$transaction([
      this.prisma.restaurant.findMany({
        where,
        include: { menuItems: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.restaurant.count({ where }),
    ]);

    const totalPages = Math.ceil(total / take);

    return {
      data: restaurants,
      meta: {
        total,
        page,
        limit: take,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get a single restaurant (with menu)
   * - Admin → any
   * - Manager/Member → only same country
   */
  async findOne(id: string, user: { role: Role; country: string }) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      include: { menuItems: true },
    });

    if (!restaurant) throw new NotFoundException('Restaurant not found');

    if (user.role !== 'ADMIN' && restaurant.country !== user.country) {
      throw new ForbiddenException('Access denied for this region');
    }

    return restaurant;
  }

  /**
   * Create a new restaurant (Admin or Manager only)
   */
  async create(
    dto: CreateRestaurantDto,
    user: { role: Role; country: string },
  ) {
    // Managers can only create restaurants in their own country
    if (user.role === 'MANAGER' && dto.country !== user.country)
      throw new ForbiddenException(
        'Cannot create restaurant in another country',
      );

    return this.prisma.restaurant.create({
      data: {
        name: dto.name,
        country: dto.country,
        menuItems: {
          create:
            dto.menuItems?.map((item) => ({
              name: item.name,
              price: item.price,
            })) || [],
        },
      },
      include: { menuItems: true },
    });
  }

  /**
   * Update restaurant details (Admin only)
   */
  async update(id: string, dto: UpdateRestaurantDto, user: { role: Role }) {
    if (user.role !== 'ADMIN')
      throw new ForbiddenException('Only admin can update restaurants');

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    return this.prisma.restaurant.update({
      where: { id },
      data: {
        name: dto.name ?? restaurant.name,
        // depends on requirement
        // country: dto.country ?? restaurant.country,
      },
    });
  }

  /**
   * Delete restaurant (Admin only)
   */
  async remove(id: string, user: { role: Role }) {
    if (user.role !== 'ADMIN')
      throw new ForbiddenException('Only admin can delete restaurants');

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    await this.prisma.restaurant.delete({ where: { id } });
    return { message: 'Restaurant deleted successfully' };
  }
}
