import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { randomUUID } from 'node:crypto';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}
  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } }))
      throw new ConflictException('Email is already registered');
    const user = await this.prisma.user.create({
      data: {
        email,
        displayName: dto.displayName,
        passwordHash: await bcrypt.hash(dto.password, 12),
        progress: { create: {} },
      },
    });
    return this.issueTokens(user);
  }
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash)))
      throw new UnauthorizedException('Invalid email or password');
    return this.issueTokens(user);
  }
  async loginWithGoogle(credential: string) {
    const googleClientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!googleClientId) throw new ServiceUnavailableException('Google sign-in is not configured');

    let payload:
      { sub?: string; email?: string; email_verified?: boolean; name?: string } | undefined;
    try {
      const ticket = await new OAuth2Client(googleClientId).verifyIdToken({
        idToken: credential,
        audience: googleClientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid Google credential');
    }
    if (!payload?.sub || !payload.email || payload.email_verified !== true)
      throw new UnauthorizedException('Google credential does not include a verified email');

    const email = payload.email.toLowerCase();
    let user = await this.prisma.user.findUnique({ where: { googleSubject: payload.sub } });
    if (!user) {
      const existingByEmail = await this.prisma.user.findUnique({ where: { email } });
      if (existingByEmail?.googleSubject && existingByEmail.googleSubject !== payload.sub)
        throw new ConflictException('This email is already linked to another Google account');
      user = existingByEmail
        ? await this.prisma.user.update({
            where: { id: existingByEmail.id },
            data: {
              googleSubject: payload.sub,
              displayName: existingByEmail.displayName ?? payload.name,
            },
          })
        : await this.prisma.user.create({
            data: {
              email,
              googleSubject: payload.sub,
              displayName: payload.name,
              passwordHash: await bcrypt.hash(randomUUID(), 12),
              progress: { create: {} },
            },
          });
    }
    return this.issueTokens(user);
  }
  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (
        !user ||
        !user.refreshTokenHash ||
        !(await bcrypt.compare(refreshToken, user.refreshTokenHash))
      )
        throw new UnauthorizedException('Invalid refresh token');
      return this.issueTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
  async logout(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { refreshTokenHash: null } });
  }
  private async issueTokens(user: User) {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.getOrThrow<string>('JWT_ACCESS_TTL') as never,
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.getOrThrow<string>('JWT_REFRESH_TTL') as never,
    });
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: await bcrypt.hash(refreshToken, 12) },
    });
    return { accessToken, refreshToken, user: this.serializeUser(user) };
  }
  private serializeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      handedness: user.handedness,
      tuning: user.tuning,
      timezone: user.timezone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
