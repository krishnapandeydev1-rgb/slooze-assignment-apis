import {
  IsEnum,
  IsNotEmpty,
  IsString,
  ValidateNested,
  IsArray,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { Country } from '@prisma/client';

class MenuItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  price: number;
}

export class CreateRestaurantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(Country)
  country: Country;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MenuItemDto)
  menuItems?: MenuItemDto[];
}

export class UpdateRestaurantDto extends PartialType(CreateRestaurantDto) {}
