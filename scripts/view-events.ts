// scripts/view-events.ts
import { prisma } from '../src/lib/prisma';

async function viewEvents() {
  try {
    const events = await prisma.event.findMany({
      where: { active: true },
      include: {
        user: {
          select: {
            name: true,
          }
        },
        task: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 15
    });

    console.log('\n📊 Recent Events:\n');
    console.log('═'.repeat(100));

    events.forEach(event => {
      const userName = event.user?.name || 'System';
      const taskInfo = event.task ? `Task #${event.task.id}: ${event.task.name}` : 'N/A';
      const date = new Date(event.createdAt).toLocaleString();
      const importance = event.importance || 'N/A';

      console.log(`ID: ${event.id}`);
      console.log(`Message: ${event.message}`);
      console.log(`Importance: ${importance}`);
      console.log(`User: ${userName}`);
      console.log(`Task: ${taskInfo}`);
      console.log(`Date: ${date}`);
      console.log('─'.repeat(100));
    });

    console.log(`\n✅ Total events: ${events.length}\n`);

  } catch (error) {
    console.error('❌ Error viewing events:', error);
  } finally {
    await prisma.$disconnect();
  }
}

viewEvents();
