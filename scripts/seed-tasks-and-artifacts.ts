// scripts/seed-tasks-and-artifacts.ts
import { prisma } from '../src/lib/prisma';

const TASKS_TO_CREATE = 10;

const taskTemplates = [
  { name: 'Prepare Q1 Financial Report',        description: 'Compile financial statements and notes for board review' },
  { name: 'Conduct Security Audit 2026',        description: 'Identify vulnerabilities and recommend remediation steps' },
  { name: 'Update Privacy Policy',              description: 'Review and update company privacy documentation' },
  { name: 'Risk Assessment Workshop',           description: 'Facilitate workshop with department heads' },
  { name: 'Internal Compliance Training',       description: 'Deliver mandatory training to all staff' },
  { name: 'Vendor Contract Review',             description: 'Assess legal and compliance risks in vendor agreements' },
  { name: 'Incident Response Drill',            description: 'Test incident response procedures with simulated attack' },
  { name: 'GDPR Gap Analysis',                  description: 'Perform gap analysis against GDPR requirements' },
  { name: 'ISO 27001 Certification Prep',       description: 'Prepare documentation for upcoming certification audit' },
  { name: 'Data Classification Exercise',       description: 'Classify all company data assets by sensitivity level' },
];

const artifactTemplates: { type: 'DOCUMENT' | 'EXCEL' | 'PDF' | 'CONTRACT' | 'LEGAL' | 'POLICY' | 'PROCEDURE' | 'REPORT'; mimeType: string; extension: string }[] = [
  { type: 'DOCUMENT',  mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extension: '.docx' },
  { type: 'EXCEL',     mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',       extension: '.xlsx' },
  { type: 'PDF',       mimeType: 'application/pdf',       extension: '.pdf' },
  { type: 'CONTRACT',  mimeType: 'application/pdf',       extension: '.pdf' },
  { type: 'POLICY',    mimeType: 'application/pdf',       extension: '.pdf' },
  { type: 'REPORT',    mimeType: 'application/pdf',       extension: '.pdf' },
];

const statuses: ('NOT_STARTED' | 'OPEN' | 'COMPLETED' | 'CLOSED')[] = ['NOT_STARTED', 'OPEN', 'OPEN', 'COMPLETED', 'CLOSED'];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomFutureDate(daysMin = 5, daysMax = 90): Date {
  const days = Math.floor(Math.random() * (daysMax - daysMin + 1)) + daysMin;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function randomPastDate(daysMax = 180): Date {
  const days = Math.floor(Math.random() * daysMax);
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function seedTasksAndArtifacts() {
  try {
    console.log('\n  Starting to seed tasks & artifacts for Acme Ltd...\n');

    // Find "Acme Ltd" organization
    const org = await prisma.organization.findFirst({
      where: { name: { contains: 'Acme', mode: 'insensitive' }, active: true },
      select: { id: true, name: true },
    });

    if (!org) {
      console.log('  No active organization matching "Acme" found.');
      console.log('  Available organizations:');
      const orgs = await prisma.organization.findMany({ where: { active: true }, select: { name: true } });
      orgs.forEach(o => console.log(`    - ${o.name}`));
      return;
    }

    console.log(`  Found organization: ${org.name} (${org.id})\n`);

    let totalTasks = 0;
    let totalArtifacts = 0;

    for (let i = 0; i < TASKS_TO_CREATE; i++) {
      const template = taskTemplates[i % taskTemplates.length];

      const task = await prisma.task.create({
        data: {
          organizationId: org.id,
          name: template.name,
          description: template.description,
          expectedEvidence: 'Meeting minutes, signed attendance list, action plan',
          startAt: randomPastDate(),
          endAt: randomFutureDate(),
          status: randomItem(statuses),
          active: true,
        },
      });
      totalTasks++;

      // Create 1-3 artifacts per task
      const artifactCount = Math.floor(Math.random() * 3) + 1;

      for (let j = 0; j < artifactCount; j++) {
        const art = randomItem(artifactTemplates);
        const artifactName = `${template.name} - ${art.type.toLowerCase()} doc`;

        const artifact = await prisma.artifact.create({
          data: {
            organizationId: org.id,
            name: artifactName,
            description: `Supporting document for "${template.name}"`,
            type: art.type,
            mimeType: art.mimeType,
            extension: art.extension,
            size: `${Math.floor(Math.random() * 12000) + 500} KB`,
            originalName: `${artifactName.replace(/ /g, '_')}${art.extension}`,
            active: true,
          },
        });

        await prisma.taskArtifact.create({
          data: {
            taskId: task.id,
            artifactId: artifact.id,
          },
        });

        totalArtifacts++;
      }

      console.log(`  Created task: "${template.name}" with ${artifactCount} artifact(s)`);
    }

    console.log(`\n  Seeding completed:`);
    console.log(`    Tasks created:     ${totalTasks}`);
    console.log(`    Artifacts created: ${totalArtifacts}`);
    console.log(`    Organization:      ${org.name}`);
  } catch (err) {
    console.error('  Seeding failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedTasksAndArtifacts();
