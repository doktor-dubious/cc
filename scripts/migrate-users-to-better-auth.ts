/**
 * One-time migration script: creates Better Auth `account` records
 * from existing users in the `login` table.
 *
 * Better Auth stores password hashes in the `account` table (not the user table).
 * This script copies each user's bcrypt passwordHash into an `account` row
 * so that existing credentials work with Better Auth's sign-in flow.
 *
 * Usage:
 *   npx tsx scripts/migrate-users-to-better-auth.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main()
{
    console.log('Starting Better Auth migration...\n');

    // Fetch all users (including inactive, for completeness)
    const users = await prisma.user.findMany({
        select: {
            id:           true,
            email:        true,
            name:         true,
            passwordHash: true,
        },
    });

    console.log(`Found ${users.length} user(s) to migrate.\n`);

    let created = 0;
    let skipped = 0;

    for (const user of users)
    {
        // Check if an account already exists for this user
        const existing = await prisma.account.findFirst({
            where: {
                userId:     user.id,
                providerId: 'credential',
            },
        });

        if (existing)
        {
            console.log(`  SKIP  ${user.email} — account already exists`);
            skipped++;
            continue;
        }

        // Create the Better Auth account record
        await prisma.account.create({
            data: {
                id:         crypto.randomUUID(),
                accountId:  user.id,
                providerId: 'credential',
                userId:     user.id,
                password:   user.passwordHash,
            },
        });

        console.log(`  OK    ${user.email}`);
        created++;
    }

    console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
}

main()
    .catch((err) => {
        console.error('Migration failed:', err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
