// scripts/seed-users-profiles.ts
import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

const USER_COUNT_PER_ORG = 4; // 4 users per organization (adjust as needed)
const TOTAL_ORGS_TO_USE = 25; // limit to first 25 orgs to avoid creating thousands of users

const firstNames = [
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Sophia', 'Lucas', 'Mia', 'Oliver', 'Isabella',
  'Elijah', 'Charlotte', 'James', 'Amelia', 'William', 'Harper', 'Benjamin', 'Evelyn', 'Henry', 'Abigail',
  'Alexander', 'Ella', 'Michael', 'Scarlett', 'Daniel', 'Grace', 'Ethan', 'Lily', 'Matthew', 'Chloe'
];

const lastNames = [
  'Jensen', 'Nielsen', 'Hansen', 'Andersen', 'Pedersen', 'Madsen', 'Kristensen', 'Olsen', 'Thomsen', 'Poulsen',
  'Larsen', 'Sørensen', 'Rasmussen', 'Jørgensen', 'Petersen', 'Mortensen', 'Jakobsen', 'Møller', 'Frederiksen', 'Christiansen',
  'Nguyen', 'Tran', 'Le', 'Pham', 'Hoang', 'Huynh', 'Vo', 'Dang', 'Bui', 'Do'
];

const workFunctions = [
  'DEVELOPER', 'DESIGNER', 'PRODUCT_MANAGER', 'MARKETING', 'SALES',
  'HR', 'FINANCE', 'OPERATIONS', 'EXECUTIVE', 'OTHER'
];

const roles = ['USER', 'ADMIN'];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateEmail(first: string, last: string): string {
  const domain = randomItem(['gmail.com', 'outlook.com', 'yahoo.com', 'proton.me', 'company.dk', 'example.com']);
  const rand = Math.floor(Math.random() * 1000);
  return `${first.toLowerCase()}.${last.toLowerCase()}${rand}@${domain}`;
}

function generateNickname(first: string): string {
  return `${first.toLowerCase()}${Math.floor(Math.random() * 99) + 1}`;
}

async function seedUsersAndProfiles() {
  try {
    console.log(`\n🌱 Starting to seed users & profiles...\n`);

    // Get some organizations (the ones you just created)
    const organizations = await prisma.organization.findMany({
      where: { active: true },
      take: TOTAL_ORGS_TO_USE,
      orderBy: { seq: 'asc' },
      select: { id: true, name: true }
    });

    if (organizations.length === 0) {
      console.log('❌ No active organizations found. Run seed-organizations.ts first.');
      return;
    }

    console.log(`Found ${organizations.length} organizations to assign users to.`);

    let totalCreated = 0;

    for (const org of organizations) {
      console.log(`\nCreating users for organization: ${org.name} (${org.id})`);

      const usersAndProfiles = await Promise.all(
        Array.from({ length: USER_COUNT_PER_ORG }).map(async (_, i) => {
          const first = randomItem(firstNames);
          const last = randomItem(lastNames);
          const name = `${first} ${last}`;
          const email = generateEmail(first, last);
          const nickname = generateNickname(first);
          const password = 'test1234'; // plain text for seed – change in real env
          const passwordHash = await bcrypt.hash(password, 10);

          // Create user
          const user = await prisma.user.create({
            data: {
              email,
              name,
              nickname,
              passwordHash,
              role: i === 0 ? 'ADMIN' : randomItem(roles), // first user per org is admin
              workFunction: randomItem(workFunctions),
              active: true,
            },
          });

          // Create profile linked to this user and organization
          const profile = await prisma.profile.create({
            data: {
              name: `Profile of ${name}`,
              description: `Team member at ${org.name} – ${user.workFunction.toLowerCase().replace('_', ' ')}`,
              userId: user.id,
              organizationId: org.id, // assign to this organization
              active: true,
              // currentOrganizationId can be set later if needed
            },
          });

          totalCreated++;

          return { user, profile };
        })
      );

      console.log(`  → Created ${usersAndProfiles.length} users + profiles`);
    }

    console.log(`\n✅ Successfully created ${totalCreated} users and ${totalCreated} profiles`);

    // Optional: print a few examples
    const examples = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        workFunction: true,
        profile: { select: { id: true, organizationId: true } }
      }
    });

    console.log('\nExamples of created users:');
    examples.forEach((u, i) => {
      console.log(`  #${i + 1}  ${u.name} (${u.email})`);
      console.log(`      • Role:       ${u.role}`);
      console.log(`      • Work:       ${u.workFunction}`);
      console.log(`      • Profile ID: ${u.profile?.id}`);
      console.log(`      • Org ID:     ${u.profile?.organizationId}`);
      console.log('');
    });

    console.log('✨ User & Profile seeding completed successfully!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedUsersAndProfiles();