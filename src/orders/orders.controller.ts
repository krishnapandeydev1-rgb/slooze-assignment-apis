import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Role } from '@prisma/client';
import { CreateOrderDto, UpdateOrderStatusDto } from './dtos';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/role.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Create a new order
   * - MEMBER → own orders only
   * - MANAGER → allowed (same country)
   * - ADMIN → allowed (any country)
   */
  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.MEMBER)
  create(@Body() dto: CreateOrderDto, @Req() req) {
    console.log(req.user);
    return this.ordersService.create(dto, req.user);
  }

  /**
   * Get all orders
   * - ADMIN → all
   * - MANAGER → only from their country
   * - MEMBER → only their own
   */
  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.MEMBER)
  findAll(@Req() req) {
    return this.ordersService.findAll(req.user);
  }

  /**
   * Get single order by ID
   * - ADMIN → any
   * - MANAGER → same country
   * - MEMBER → own orders only
   */
  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.MEMBER)
  findOne(@Param('id') id: string, @Req() req) {
    return this.ordersService.findOne(id, req.user);
  }

  /**
   * Update order status
   * - ADMIN → any
   * - MANAGER → same country
   * - MEMBER → not allowed
   */
  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.MANAGER)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Req() req,
  ) {
    return this.ordersService.updateStatus(id, dto, req.user);
  }

  /**
   * Cancel order
   * - MEMBER → own order only (if not paid)
   * - ADMIN/MANAGER → allowed (their scope)
   */
  @Patch(':id/cancel')
  @Roles(Role.ADMIN, Role.MANAGER, Role.MEMBER)
  cancel(@Param('id') id: string, @Req() req) {
    return this.ordersService.cancel(id, req.user);
  }
}
