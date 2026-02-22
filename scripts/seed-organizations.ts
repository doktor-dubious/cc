// scripts/seed-organizations.ts
import { prisma } from '../src/lib/prisma';

const ORGANIZATION_COUNT = 100;

const companyPrefixes = [
  'Tech', 'Global', 'Smart', 'Inno', 'Core', 'Peak', 'Nexus', 'Vibe', 'Pulse', 'Apex',
  'Bright', 'Elite', 'Fusion', 'Quantum', 'Horizon', 'Nova', 'Vertex', 'Strive', 'Catalyst', 'Momentum'
];

const companySuffixes = [
  'Solutions', 'Labs', 'Systems', 'Group', 'Network', 'Ventures', 'Partners', 'Works', 'Digital', 'Tech',
  'Services', 'Media', 'Consulting', 'Studio', 'Agency', 'Cloud', 'AI', 'Data', 'Security', 'Health'
];

const industries = [
  'Software Development', 'FinTech', 'HealthTech', 'EdTech', 'Logistics', 'E-commerce',
  'Marketing', 'Consulting', 'Renewable Energy', 'Cybersecurity', 'AI & Machine Learning',
  'Biotechnology', 'Real Estate Tech', 'Gaming', 'Media & Entertainment', 'Supply Chain'
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateCompanyName(): string {
  const prefix = randomItem(companyPrefixes);
  const suffix = randomItem(companySuffixes);
  return `${prefix} ${suffix}`;
}

function generateDescription(name: string): string {
  const industry = randomItem(industries);
  return `${name} is a fast-growing ${industry.toLowerCase()} company focused on innovation, scalability, and user-centric solutions. Founded in 2020, we help businesses transform their operations through modern technology.`;
}

async function seedOrganizations() {
  try {
    console.log(`\n🌱 Starting to seed ${ORGANIZATION_COUNT} organizations...\n`);

    const created: Array<{ org: any; settings: any }> = [];

    // Optional: check how many already exist
    const existingCount = await prisma.organization.count();
    console.log(`Current organizations in DB: ${existingCount}`);

    for (let i = 0; i < ORGANIZATION_COUNT; i++) {
      const name = generateCompanyName();
      const description = generateDescription(name);

      // Create organization
      const org = await prisma.organization.create({
        data: {
          name,
          description,
          active: true,
          // seq is auto-generated
        },
      });

      // Create settings (1:1 relation)
      const settings = await prisma.organisationSettings.create({
        data: {
          organizationId: org.id,
          uploadDirectory: `/uploads/${org.id.slice(0, 8)}`,
          downloadDirectory: `/downloads/${org.id.slice(0, 8)}`,
          artifactDirectory: `/artifacts/${org.id.slice(0, 8)}`,
          active: true,
        },
      });

      created.push({ org, settings });

      if ((i + 1) % 20 === 0) {
        console.log(`  → Created ${i + 1} organizations so far...`);
      }
    }

    console.log(`\n✅ Successfully created ${created.length} organizations + settings pairs`);

    // Optional: print a few examples
    console.log('\nExamples:');
    created.slice(0, 3).forEach(({ org, settings }, idx) => {
      console.log(`  #${idx + 1}  ${org.name}`);
      console.log(`      • ID:          ${org.id}`);
      console.log(`      • Description: ${org.description?.slice(0, 80)}...`);
      console.log(`      • Upload dir:  ${settings.uploadDirectory}`);
      console.log('');
    });

    console.log('✨ Seeding finished. You can now browse organizations in the app.');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedOrganizations();