// scripts/seed-messages.ts
import { prisma } from '../src/lib/prisma';

async function seedMessages() {
  try {
    // Get the first task to attach messages to
    const task = await prisma.task.findFirst({
      where: { active: true },
    });

    if (!task) {
      console.log('❌ No tasks found. Please create a task first.');
      return;
    }

    console.log(`✓ Found task: ${task.name} (ID: ${task.id})`);

    // Get the first user to use as sender
    const user = await prisma.user.findFirst({
      where: { active: true },
    });

    if (!user) {
      console.log('❌ No users found.');
      return;
    }

    console.log(`✓ Found user: ${user.name} (ID: ${user.id})`);

    // Create some test messages (last 5 are unread)
    const messages = [
      {
        taskId: task.id,
        type: 'SYSTEM' as const,
        content: 'Task has been created and assigned.',
        senderId: null,
        isRead: true,
      },
      {
        taskId: task.id,
        type: 'USER' as const,
        content: 'I have started working on this task. Will provide an update by end of day.',
        senderId: user.id,
        isRead: true,
      },
      {
        taskId: task.id,
        type: 'USER' as const,
        content: 'Quick question - should I focus on the documentation first or start with the implementation?',
        senderId: user.id,
        isRead: true,
      },
      {
        taskId: task.id,
        type: 'USER' as const,
        content: 'I think we should start with implementation and document as we go. That way we can ensure accuracy.',
        senderId: user.id,
        isRead: true,
      },
      {
        taskId: task.id,
        type: 'SYSTEM' as const,
        content: 'Task status changed from NOT_STARTED to OPEN.',
        senderId: null,
        isRead: true,
      },
      {
        taskId: task.id,
        type: 'USER' as const,
        content: 'Made good progress today. Completed the initial setup and configuration. About 25% complete.',
        senderId: user.id,
        isRead: true,
      },
      {
        taskId: task.id,
        type: 'USER' as const,
        content: 'Encountered a small issue with the database schema. Working on resolving it now.',
        senderId: user.id,
        isRead: true,
      },
      {
        taskId: task.id,
        type: 'SYSTEM' as const,
        content: 'New artifact "Requirements.pdf" has been attached to this task.',
        senderId: null,
        isRead: true,
      },
      {
        taskId: task.id,
        type: 'USER' as const,
        content: 'Great! I\'ve reviewed the requirements document. Everything looks clear.',
        senderId: user.id,
        isRead: true,
      },
      {
        taskId: task.id,
        type: 'USER' as const,
        content: 'Halfway there! Completed the core functionality. Now working on edge cases and error handling.',
        senderId: user.id,
        isRead: true,
      },
      {
        taskId: task.id,
        type: 'USER' as const,
        content: 'Question: Do we need to support legacy browsers for this feature?',
        senderId: user.id,
        isRead: true,
      },
      {
        taskId: task.id,
        type: 'USER' as const,
        content: 'Based on our analytics, 95% of users are on modern browsers. Let\'s focus on those for now.',
        senderId: user.id,
        isRead: true,
      },
      {
        taskId: task.id,
        type: 'SYSTEM' as const,
        content: 'New artifact "Design_Mockups.fig" has been attached to this task.',
        senderId: null,
        isRead: true,
      },
      {
        taskId: task.id,
        type: 'USER' as const,
        content: 'Thanks for the mockups! The design looks great. I\'ll match it exactly.',
        senderId: user.id,
        isRead: true,
      },
      {
        taskId: task.id,
        type: 'USER' as const,
        content: 'Update: 75% complete. All major features implemented. Starting testing phase.',
        senderId: user.id,
        isRead: true,
      },
      {
        taskId: task.id,
        type: 'SYSTEM' as const,
        content: 'Profile "QA Team" has been assigned to this task.',
        senderId: null,
        isRead: true,
      },
      {
        taskId: task.id,
        type: 'USER' as const,
        content: 'Found a few edge cases during testing. Creating fixes now.',
        senderId: user.id,
        isRead: true,
      },
      {
        taskId: task.id,
        type: 'USER' as const,
        content: 'All edge cases resolved. Running final tests before marking as complete.',
        senderId: user.id,
        isRead: true,
      },
      {
        taskId: task.id,
        type: 'USER' as const,
        content: 'Tests are passing! 🎉 Ready for review.',
        senderId: user.id,
        isRead: true,
      },
      {
        taskId: task.id,
        type: 'SYSTEM' as const,
        content: 'Task status changed from OPEN to COMPLETED.',
        senderId: null,
        isRead: true,
      },
      // Last 5 messages are UNREAD (new messages)
      {
        taskId: task.id,
        type: 'USER' as const,
        content: 'Great work everyone! This feature is now live in production.',
        senderId: user.id,
        isRead: false,
      },
      {
        taskId: task.id,
        type: 'SYSTEM' as const,
        content: 'New artifact "Test_Results.pdf" has been attached to this task.',
        senderId: null,
        isRead: false,
      },
      {
        taskId: task.id,
        type: 'USER' as const,
        content: 'Added comprehensive test results for documentation. All tests passed.',
        senderId: user.id,
        isRead: false,
      },
      {
        taskId: task.id,
        type: 'USER' as const,
        content: 'Thank you all for your collaboration on this task. Looking forward to the next one!',
        senderId: user.id,
        isRead: false,
      },
      {
        taskId: task.id,
        type: 'USER' as const,
        content: 'Just wanted to follow up - can we schedule a review meeting for next week?',
        senderId: user.id,
        isRead: false,
      },
    ];

    console.log('\n📝 Creating test messages...\n');

    for (const messageData of messages) {
      const message = await prisma.message.create({
        data: messageData,
        include: {
          sender: {
            select: {
              name: true,
            },
          },
        },
      });

      const senderName = message.type === 'SYSTEM' ? 'SYSTEM' : message.sender?.name;
      console.log(`✓ Created ${message.type} message from ${senderName}`);
    }

    console.log(`\n✅ Successfully created ${messages.length} test messages for task "${task.name}"`);
  } catch (error) {
    console.error('❌ Error seeding messages:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedMessages();
