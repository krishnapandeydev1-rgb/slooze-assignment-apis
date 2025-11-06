import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { jwtConstants } from 'src/auth/contants';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    // ✅ 1️⃣ Try to get token from cookie
    let token = req.cookies?.access_token;

    // ✅ 2️⃣ If no cookie, fall back to Authorization header
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    // ❌ 3️⃣ If still no token, reject
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      // ✅ 4️⃣ Verify token
      const payload = await this.jwt.verifyAsync(token, {
        secret: jwtConstants.secret || 'dev_secret',
      });

      req.user = payload; // attach user info for downstream controllers
      return true;
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
