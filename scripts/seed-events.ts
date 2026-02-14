// scripts/seed-events.ts
import { prisma } from '../src/lib/prisma';

async function seedEvents() {
  try {
    // Get some existing tasks
    const tasks = await prisma.task.findMany({
      where: { active: true },
      take: 3,
      orderBy: { id: 'asc' }
    });

    if (tasks.length === 0) {
      console.log('❌ No tasks found. Please create some tasks first.');
      return;
    }

    // Get some users for event attribution
    const users = await prisma.user.findMany({
      where: { active: true },
      take: 2,
      orderBy: { id: 'asc' }
    });

    if (users.length === 0) {
      console.log('❌ No users found.');
      return;
    }

    const user1 = users[0];
    const user2 = users.length > 1 ? users[1] : users[0];

    console.log('\n📝 Creating example events...\n');

    // Create events for the first task
    const task1 = tasks[0];

    const events1 = await Promise.all([
      prisma.event.create({
        data: {
          message: 'Task created',
          importance: 'HIGH',
          userId: user1.id,
          taskId: task1.id,
          organizationId: task1.organizationId,
        }
      }),
      prisma.event.create({
        data: {
          message: `Task status changed from NOT_STARTED to OPEN`,
          importance: 'MIDDLE',
          userId: user1.id,
          taskId: task1.id,
          organizationId: task1.organizationId,
        }
      }),
      prisma.event.create({
        data: {
          message: 'Task description updated',
          importance: 'LOW',
          userId: user2.id,
          taskId: task1.id,
          organizationId: task1.organizationId,
        }
      }),
      prisma.event.create({
        data: {
          message: 'Profile assigned to task',
          importance: 'MIDDLE',
          userId: user1.id,
          taskId: task1.id,
          organizationId: task1.organizationId,
        }
      }),
      prisma.event.create({
        data: {
          message: 'Artifact attached to task',
          importance: 'LOW',
          userId: user2.id,
          taskId: task1.id,
          organizationId: task1.organizationId,
        }
      }),
    ]);

    console.log(`✅ Created ${events1.length} events for Task #${task1.id} "${task1.name}"`);

    // Create events for the second task if it exists
    if (tasks.length > 1) {
      const task2 = tasks[1];

      const events2 = await Promise.all([
        prisma.event.create({
          data: {
            message: 'Task created',
            importance: 'HIGH',
            userId: user2.id,
            taskId: task2.id,
            organizationId: task2.organizationId,
          }
        }),
        prisma.event.create({
          data: {
            message: 'Start date updated',
            importance: 'LOW',
            userId: user2.id,
            taskId: task2.id,
            organizationId: task2.organizationId,
          }
        }),
        prisma.event.create({
          data: {
            message: 'Expected evidence requirements added',
            importance: 'MIDDLE',
            userId: user1.id,
            taskId: task2.id,
            organizationId: task2.organizationId,
          }
        }),
        prisma.event.create({
          data: {
            message: 'Task status changed from NOT_STARTED to COMPLETED',
            importance: 'HIGH',
            userId: null, // System-generated event
            taskId: task2.id,
            organizationId: task2.organizationId,
          }
        }),
      ]);

      console.log(`✅ Created ${events2.length} events for Task #${task2.id} "${task2.name}"`);
    }

    // Create events for the third task if it exists
    if (tasks.length > 2) {
      const task3 = tasks[2];

      const events3 = await Promise.all([
        prisma.event.create({
          data: {
            message: 'Task created',
            importance: 'HIGH',
            userId: user1.id,
            taskId: task3.id,
            organizationId: task3.organizationId,
          }
        }),
        prisma.event.create({
          data: {
            message: 'Automated reminder sent',
            importance: 'LOW',
            userId: null, // System-generated
            taskId: task3.id,
            organizationId: task3.organizationId,
          }
        }),
        prisma.event.create({
          data: {
            message: 'Task deadline extended by 7 days',
            importance: 'MIDDLE',
            userId: user2.id,
            taskId: task3.id,
            organizationId: task3.organizationId,
          }
        }),
      ]);

      console.log(`✅ Created ${events3.length} events for Task #${task3.id} "${task3.name}"`);
    }

    console.log('\n✨ Event seeding completed successfully!\n');
    console.log('💡 Tip: Open the Task page and select a task to view the Audit Trail tab.');

  } catch (error) {
    console.error('❌ Error seeding events:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedEvents();
