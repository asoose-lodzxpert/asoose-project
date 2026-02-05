// 08-bank.ts
import { prisma } from './seed-utils';
import { nigerianBanks } from './banks-seed';

export async function seedBanks() {
  console.log('🌱 Seeding Banks...');

  for (const bank of nigerianBanks) {
    if (!bank.code) continue; // skip banks with no code
    await prisma.bank.upsert({
      where: { code: bank.code },
      update: {},
      create: {
        name: bank.name,
        code: bank.code,
      },
    });
  }
}
