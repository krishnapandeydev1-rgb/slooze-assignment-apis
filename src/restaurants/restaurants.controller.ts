import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';

import { Role } from '@prisma/client';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/role.decorator';
import type { Request } from 'express';
import { CreateRestaurantDto, UpdateRestaurantDto } from './dtos';
@Controller('restaurants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  /**
   * Get all restaurants
   * - ADMIN → all
   * - MANAGER/MEMBER → only their country
   */
  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.MEMBER)
  findAll(@Req() req: Request) {
    return this.restaurantsService.findAll(req['user']);
  }

  /**
   * Get a single restaurant with its menu
   * - ADMIN → any
   * - MANAGER/MEMBER → only if in their country
   */
  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.MEMBER)
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.restaurantsService.findOne(id, req['user']);
  }

  /**
   * Create a new restaurant
   * - ADMIN → any country
   * - MANAGER → only in their own country
   * - MEMBER → not allowed
   */
  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  create(@Body() dto: CreateRestaurantDto, @Req() req: Request) {
    return this.restaurantsService.create(dto, req['user']);
  }

  /**
   * Update a restaurant
   * - Only ADMIN allowed
   */
  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRestaurantDto,
    @Req() req: Request,
  ) {
    return this.restaurantsService.update(id, dto, req['user']);
  }

  /**
   * Delete a restaurant
   * - Only ADMIN allowed
   */
  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.restaurantsService.remove(id, req['user']);
  }
}
