// scripts/seed-settings.ts
import { prisma } from '../src/lib/prisma';

async function seedSettings() {
  try {
    // Check if there's already an active settings record
    const existingSettings = await prisma.settings.findFirst({
      where: { active: true },
    });

    if (existingSettings) {
      console.log(`✓ Active settings already exist (ID: ${existingSettings.id})`);
      console.log(`  - Application Name: ${existingSettings.applicationName}`);
      console.log(`  - Home Directory: ${existingSettings.homeDirectory}`);
      console.log(`  - Polling Interval: ${existingSettings.pollingInterval}ms`);
      return;
    }

    // Create default settings
    const settings = await prisma.settings.create({
      data: {
        applicationName: 'Compliance Circle',
        homeDirectory: '/home/compliance',
        pollingInterval: 30000, // 30 seconds default
        active: true,
      },
    });

    console.log('✅ Default settings created successfully!');
    console.log(`  - ID: ${settings.id}`);
    console.log(`  - Application Name: ${settings.applicationName}`);
    console.log(`  - Home Directory: ${settings.homeDirectory}`);
    console.log(`  - Polling Interval: ${settings.pollingInterval}ms (${settings.pollingInterval / 1000}s)`);
  } catch (error) {
    console.error('❌ Error seeding settings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedSettings();
