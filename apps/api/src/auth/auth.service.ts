import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './strategies/jwt.strategy';

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return { id: user.id, email: user.email, role: user.role };
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
      },
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async refreshAccessToken(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const accessToken = await this.generateAccessToken(
      user.id,
      user.email,
      user.role,
    );

    return { accessToken };
  }

  async generateTokens(userId: string, email: string, role: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(userId, email, role),
      this.generateRefreshToken(userId, email, role),
    ]);

    return { accessToken, refreshToken };
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  private async generateAccessToken(
    userId: string,
    email: string,
    role: string,
  ): Promise<string> {
    const payload = {
      sub: userId,
      email,
      role,
      type: 'access' as const,
    };

    return this.jwtService.signAsync(payload as any, {
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRY', '15m') as any,
    });
  }

  private async generateRefreshToken(
    userId: string,
    email: string,
    role: string,
  ): Promise<string> {
    const payload = {
      sub: userId,
      email,
      role,
      type: 'refresh' as const,
    };

    return this.jwtService.signAsync(payload as any, {
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRY', '7d') as any,
    });
  }
}
