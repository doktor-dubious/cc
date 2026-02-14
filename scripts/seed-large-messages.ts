// scripts/seed-large-messages.ts
import { prisma } from '../src/lib/prisma';

async function seedLargeMessages() {
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

    // Create test messages with varying lengths (some very long)
    const messages = [
      {
        taskId: task.id,
        type: 'USER' as const,
        content: 'Short message to test line clamp.',
        senderId: user.id,
        isRead: false,
      },
      {
        taskId: task.id,
        type: 'USER' as const,
        content: 'This is a medium length message that should wrap to exactly two lines when displayed in the message list. This will test the line-clamp-2 CSS class to ensure it truncates properly with an ellipsis.',
        senderId: user.id,
        isRead: false,
      },
      {
        taskId: task.id,
        type: 'SYSTEM' as const,
        content: 'SYSTEM NOTIFICATION: This is a very long system message that contains important information about the task status update. The system has automatically processed your request and updated all related records in the database. Please review the changes and confirm that everything is correct. If you notice any discrepancies, please report them immediately to the system administrator.',
        senderId: null,
        isRead: false,
      },
      {
        taskId: task.id,
        type: 'USER' as const,
        content: `DETAILED UPDATE REPORT

I wanted to provide a comprehensive update on the current status of our project. Over the past week, we've made significant progress in several key areas:

1. Backend Development:
   - Completed the API authentication layer
   - Implemented rate limiting and security measures
   - Optimized database queries for better performance
   - Added comprehensive error handling and logging

2. Frontend Implementation:
   - Redesigned the user dashboard with improved UX
   - Integrated real-time notifications
   - Added responsive design for mobile devices
   - Implemented accessibility features (WCAG 2.1 AA compliance)

3. Testing & Quality Assurance:
   - Wrote unit tests for critical components (85% coverage)
   - Performed integration testing across all modules
   - Conducted security penetration testing
   - Fixed 23 bugs identified during QA phase

4. Documentation:
   - Updated API documentation with all new endpoints
   - Created user guides and tutorials
   - Documented deployment procedures
   - Added inline code comments for maintainability

Next Steps:
- Deploy to staging environment for final review
- Conduct user acceptance testing with stakeholders
- Prepare for production deployment next week

Please let me know if you have any questions or concerns about any of these items. I'm available for a detailed discussion at your convenience.`,
        senderId: user.id,
        isRead: false,
      },
      {
        taskId: task.id,
        type: 'USER' as const,
        content: 'Thanks for the detailed update! Everything looks great. Just one quick question: when you mention "rate limiting," what specific limits did we implement? I want to make sure our clients are aware of any API restrictions.',
        senderId: user.id,
        isRead: false,
      },
      {
        taskId: task.id,
        type: 'USER' as const,
        content: `Good question! Here are the rate limiting details:

API Rate Limits:
- Standard users: 100 requests per minute
- Premium users: 500 requests per minute
- Enterprise users: 2000 requests per minute

We also implemented:
- Burst allowance: 20% over limit for 5 seconds
- Graceful degradation with 429 status codes
- Response headers showing remaining quota
- Automatic retry-after suggestions

These limits are configurable per client if needed. Let me know if we need to adjust anything for specific use cases!`,
        senderId: user.id,
        isRead: false,
      },
      {
        taskId: task.id,
        type: 'SYSTEM' as const,
        content: 'Task priority has been changed from MEDIUM to HIGH. This task now requires immediate attention. All team members assigned to this task have been notified via email and Slack. Please review the updated requirements and adjust your schedule accordingly. Deadline: End of business day, Friday.',
        senderId: null,
        isRead: false,
      },
      {
        taskId: task.id,
        type: 'USER' as const,
        content: `IMPORTANT: Security Vulnerability Discovered

During our penetration testing, we identified a critical security vulnerability in the authentication system. Here's what we found:

Issue: JWT tokens were not properly validating the 'exp' claim, potentially allowing expired tokens to remain valid.

Impact: Medium-High
- Affected versions: v2.0.0 to v2.3.5
- Potential for unauthorized access
- No evidence of exploitation in production

Resolution:
✓ Patched in version 2.3.6 (deployed to staging)
✓ Added additional token validation checks
✓ Implemented automated security scanning in CI/CD
✓ Updated security documentation

Action Required:
1. Review access logs for any suspicious activity
2. Force token refresh for all active sessions
3. Schedule deployment to production ASAP
4. Notify security team of findings

I've attached the full security report and remediation steps. This should be our top priority before the production deployment.`,
        senderId: user.id,
        isRead: false,
      },
    ];

    console.log('\n📝 Creating test messages with varying lengths...\n');

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
      const preview = message.content.substring(0, 50) + '...';
      console.log(`✓ Created ${message.type} message from ${senderName}: "${preview}"`);
    }

    console.log(`\n✅ Successfully created ${messages.length} test messages (including large ones) for task "${task.name}"`);
  } catch (error) {
    console.error('❌ Error seeding messages:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedLargeMessages();
