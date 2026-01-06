import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAdminDto } from './dto/create-admins.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAdminDto, creatorId: string) {
    // 1. Check if email exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // 2. Hash Password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 3. Create the Admin User
    const newUser = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        password: hashedPassword,
        role: dto.role as any, // Cast to Prisma enum
        status: 'ACTIVE',
      },
    });

    // 4. Log the Action (Audit Trail)
    await this.prisma.activityLog.create({
      data: {
        userId: creatorId,
        action: 'ADMIN_CREATED',
        target: `User: ${newUser.id}`,
        details: `Created new ${dto.role}: ${dto.email}`,
      },
    });

    // Return user without password
    const { password, ...result } = newUser;
    return result;
  }

  // List all admins (excluding customers/riders/vendors)
  async findAll() {
    return this.prisma.user.findMany({
      where: {
        role: { in: ['SUPER_ADMIN', 'ADMIN_MANAGER', 'ADMIN_SUPPORT', 'ADMIN_FINANCE'] }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });
  }
  
  // Revoke Access (Ban/Delete)
  async remove(id: string, creatorId: string) {
    // Prevent self-deletion
    if (id === creatorId) {
        throw new BadRequestException("You cannot delete your own account");
    }

    const user = await this.prisma.user.delete({ where: { id } });
    
    await this.prisma.activityLog.create({
        data: {
            userId: creatorId,
            action: 'ADMIN_DELETED',
            target: `User: ${id}`,
            details: `Deleted admin ${user.email}`
        }
    });
    
    return { message: 'Admin removed successfully' };
  }
}