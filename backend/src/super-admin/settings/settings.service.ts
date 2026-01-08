import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  // Get all settings formatted as a simple object
  async findAll() {
    const settings = await this.prisma.systemSetting.findMany();
    // Convert array to object for easier frontend consumption, or return array
    return settings; 
  }

  async seedDefaults() {
    const defaults = [
      { key: 'maintenance_mode', value: 'false', category: 'General' },
      { key: 'global_commission', value: '10', category: 'Financials' },
      { key: 'support_phone', value: '+234 800 000', category: 'General' },
    ];

    for (const d of defaults) {
      await this.prisma.systemSetting.upsert({
        where: { key: d.key },
        update: {},
        create: d,
      });
    }
  }

  // Update multiple settings at once
  async updateBulk(settings: { key: string; value: any }[]) {
    const updates = settings.map((s) =>
      this.prisma.systemSetting.update({
        where: { key: s.key },
        data: { value: String(s.value) },
      }),
    );
    return this.prisma.$transaction(updates);
  }
}