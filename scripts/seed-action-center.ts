// scripts/seed-action-center.ts
// Generates test tasks + messages for each Action Center section:
//   - Needs Attention (Evidence, Chat, Request)
//   - Overdue
//   - Due Soon

import { prisma } from '../src/lib/prisma';

const ORG_ID = 'fefb1593-0c4f-4a63-97fa-c4995cdbe19a';

async function seed() {
  try {
    // ── Verify org exists ─────────────────────────────────────────────────
    const org = await prisma.organization.findUnique({ where: { id: ORG_ID } });
    if (!org) {
      console.log(`❌ Organization ${ORG_ID} not found.`);
      return;
    }
    console.log(`✓ Organization: ${org.name}`);

    // ── Get a user to act as sender ───────────────────────────────────────
    const user = await prisma.user.findFirst({ where: { active: true } });
    if (!user) {
      console.log('❌ No active users found.');
      return;
    }
    console.log(`✓ User: ${user.name} (${user.id})`);

    // ── Get or find a profile linked to this org ──────────────────────────
    const profile = await prisma.profile.findFirst({
      where: { organizationId: ORG_ID, active: true },
    });
    console.log(profile ? `✓ Profile: ${profile.name}` : '⚠ No profile found for org, skipping profile links');

    const now = new Date();

    // ────────────────────────────────────────────────────────────────────────
    // SECTION 1: Needs Attention
    //   These tasks are active (OPEN), with unread messages of various types
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n── Needs Attention ──────────────────────────────────');

    // 1a) Evidence — file uploaded, ASSET message with assetName
    const taskEvidence = await prisma.task.create({
      data: {
        organizationId: ORG_ID,
        name: 'Review firewall configuration',
        description: 'Validate the uploaded firewall config meets security standards.',
        status: 'OPEN',
        startAt: new Date(now.getTime() - 7 * 86400000),
        endAt: new Date(now.getTime() + 5 * 86400000),
      },
    });
    if (profile) {
      await prisma.taskProfile.create({
        data: { taskId: taskEvidence.id, profileId: profile.id },
      });
    }
    await prisma.message.create({
      data: {
        taskId: taskEvidence.id,
        senderId: user.id,
        origin: 'USER',
        type: 'ASSET',
        assetName: 'firewall-config-2026.pdf',
        content: 'Firewall configuration uploaded',
        isRead: false,
        replyTo: profile?.id || null,
      },
    });
    console.log(`✓ Evidence task: ${taskEvidence.name} (${taskEvidence.id})`);

    // 1b) Evidence — network diagram
    const taskEvidence2 = await prisma.task.create({
      data: {
        organizationId: ORG_ID,
        name: 'Validate network diagram',
        description: 'Network diagram requires validation against current topology.',
        status: 'OPEN',
        startAt: new Date(now.getTime() - 3 * 86400000),
        endAt: new Date(now.getTime() + 10 * 86400000),
      },
    });
    if (profile) {
      await prisma.taskProfile.create({
        data: { taskId: taskEvidence2.id, profileId: profile.id },
      });
    }
    await prisma.message.create({
      data: {
        taskId: taskEvidence2.id,
        senderId: user.id,
        origin: 'USER',
        type: 'ASSET',
        assetName: 'network-diagram-v3.png',
        content: 'Network diagram requires validation',
        isRead: false,
        replyTo: profile?.id || null,
      },
    });
    console.log(`✓ Evidence task: ${taskEvidence2.name} (${taskEvidence2.id})`);

    // 1c) Chat — client asked about MFA requirements
    const taskChat = await prisma.task.create({
      data: {
        organizationId: ORG_ID,
        name: 'MFA requirements clarification',
        description: 'Client needs clarification on multi-factor authentication requirements.',
        status: 'OPEN',
        startAt: new Date(now.getTime() - 5 * 86400000),
        endAt: new Date(now.getTime() + 14 * 86400000),
      },
    });
    if (profile) {
      await prisma.taskProfile.create({
        data: { taskId: taskChat.id, profileId: profile.id },
      });
    }
    await prisma.message.create({
      data: {
        taskId: taskChat.id,
        senderId: user.id,
        origin: 'USER',
        type: 'NOTE',
        content: 'Client asked about MFA requirements',
        isRead: false,
      },
    });
    console.log(`✓ Chat task: ${taskChat.name} (${taskChat.id})`);

    // 1d) Request — reopen request
    const taskRequest = await prisma.task.create({
      data: {
        organizationId: ORG_ID,
        name: 'Access Control Policy review',
        description: 'Review and update the access control policy document.',
        status: 'OPEN',
        startAt: new Date(now.getTime() - 10 * 86400000),
        endAt: new Date(now.getTime() + 7 * 86400000),
      },
    });
    if (profile) {
      await prisma.taskProfile.create({
        data: { taskId: taskRequest.id, profileId: profile.id },
      });
    }
    await prisma.message.create({
      data: {
        taskId: taskRequest.id,
        senderId: user.id,
        origin: 'USER',
        type: 'REQUEST',
        requestType: 'REOPEN',
        content: 'Reopen request for "Access Control Policy"',
        isRead: false,
      },
    });
    console.log(`✓ Request task: ${taskRequest.name} (${taskRequest.id})`);

    // ────────────────────────────────────────────────────────────────────────
    // SECTION 2: Overdue
    //   Tasks with endAt in the past, still OPEN or NOT_STARTED
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n── Overdue ─────────────────────────────────────────');

    const overdueItems = [
      { name: 'Complete Organization Profile',  desc: 'Fill in all required organization profile fields.',                status: 'OPEN' as const,        daysOverdue: 6 },
      { name: 'Review security policies',       desc: 'Annual review of all security policies.',                           status: 'NOT_STARTED' as const, daysOverdue: 8 },
      { name: 'Approve access control matrix',  desc: 'Review and approve the updated access control matrix.',             status: 'OPEN' as const,        daysOverdue: 4 },
    ];

    for (const item of overdueItems) {
      const task = await prisma.task.create({
        data: {
          organizationId: ORG_ID,
          name: item.name,
          description: item.desc,
          status: item.status,
          startAt: new Date(now.getTime() - (item.daysOverdue + 14) * 86400000),
          endAt: new Date(now.getTime() - item.daysOverdue * 86400000),
        },
      });
      if (profile) {
        await prisma.taskProfile.create({
          data: { taskId: task.id, profileId: profile.id },
        });
      }
      console.log(`✓ Overdue task: ${task.name} (${task.id}) — due ${item.daysOverdue}d ago`);
    }

    // ────────────────────────────────────────────────────────────────────────
    // SECTION 3: Due Soon
    //   Tasks with endAt within the next 7 days, still active
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n── Due Soon ────────────────────────────────────────');

    const dueSoonItems = [
      { name: 'Submit incident response plan',      desc: 'Finalize and submit the incident response plan.',        status: 'OPEN' as const,        daysUntilDue: 2 },
      { name: 'Update asset inventory',             desc: 'Reconcile hardware and software asset inventory.',        status: 'OPEN' as const,        daysUntilDue: 5 },
      { name: 'Complete vulnerability scan report',  desc: 'Run scans and compile the quarterly vulnerability report.', status: 'NOT_STARTED' as const, daysUntilDue: 6 },
    ];

    for (const item of dueSoonItems) {
      const task = await prisma.task.create({
        data: {
          organizationId: ORG_ID,
          name: item.name,
          description: item.desc,
          status: item.status,
          startAt: new Date(now.getTime() - 7 * 86400000),
          endAt: new Date(now.getTime() + item.daysUntilDue * 86400000),
        },
      });
      if (profile) {
        await prisma.taskProfile.create({
          data: { taskId: task.id, profileId: profile.id },
        });
      }
      console.log(`✓ Due Soon task: ${task.name} (${task.id}) — due in ${item.daysUntilDue}d`);
    }

    console.log('\n✅ Seed complete — 10 tasks created for Action Center');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
