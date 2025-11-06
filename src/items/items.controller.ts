import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ItemsService } from './items.service';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/role.decorator';
import { Country, Role } from '@prisma/client';
import { CreateMenuItemDto } from './dtos';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('items')
@UseGuards(JwtAuthGuard)
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @UseGuards(RolesGuard)
  async create(@Body() dto: CreateMenuItemDto, @Req() req: any) {
    const user = req['user'] as { role: Role; country: Country };
    return await this.itemsService.create(dto, user.role, user.country);
  }

  /**
   * GET /items
   * Optional query params:
   * - restaurantId (string)
   * - page (number, default: 1)
   * - limit (number, default: 10)
   */
  @Get()
  async findAll(
    @Query('restaurantId') restaurantId?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.itemsService.findAll({
      restaurantId,
      page: Number(page),
      limit: Number(limit),
    });
  }
}
