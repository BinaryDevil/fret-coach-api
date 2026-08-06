import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}
  async me(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        displayName: true,
        handedness: true,
        tuning: true,
        timezone: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
  update(id: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        email: true,
        displayName: true,
        handedness: true,
        tuning: true,
        timezone: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
