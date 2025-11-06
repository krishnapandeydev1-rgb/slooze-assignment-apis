import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dtos';
import type { Response } from 'express';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const access_token = await this.authService.login(loginDto);

    // ✅ Set token as an HTTP-only cookie
    res.cookie('access_token', access_token, {
      httpOnly: true, // prevent access from JS
      secure: process.env.NODE_ENV === 'production', // use HTTPS in prod
      sameSite: 'lax', // prevent CSRF
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/', // available for all routes
    });

    return { access_token };
  }
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req: Request) {
    return req['user']; // return payload or user data
  }
  @UseGuards(JwtAuthGuard)
  @Get('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    return this.authService.logout(res);
  }
}
