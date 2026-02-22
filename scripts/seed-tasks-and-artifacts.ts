// scripts/seed-tasks-artifacts.ts
import { prisma } from '../src/lib/prisma';

const TASKS_PER_ORG = 6;
const ARTIFACTS_PER_TASK_AVG = 2;
const TOTAL_ORGS_TO_USE = 20;

const taskNames = [
  'Prepare Q1 Financial Report',
  'Conduct Security Audit 2026',
  'Onboard New Sales Team',
  'Update Privacy Policy',
  'Develop New Mobile App Feature',
  'Risk Assessment Workshop',
  'Internal Compliance Training',
  'Vendor Contract Review',
  'Incident Response Drill',
  'Data Protection Impact Assessment',
  'Annual Board Report Preparation',
  'GDPR Gap Analysis',
  'ISO 27001 Certification Prep',
  'Employee Handbook Revision',
  'Cybersecurity Awareness Campaign',
  'Business Continuity Plan Update',
  'Third-Party Risk Review',
  'Whistleblower Policy Rollout',
  'Data Classification Exercise',
  'Access Control Audit'
];

const descriptions = [
  'Compile financial statements and notes for board review',
  'Identify vulnerabilities and recommend remediation steps',
  'Create onboarding materials and schedule training sessions',
  'Review and update company privacy documentation',
  'Implement user authentication improvements',
  'Facilitate workshop with department heads',
  'Deliver mandatory training to all staff',
  'Assess legal and compliance risks in vendor agreements',
  'Test incident response procedures with simulated attack',
  'Conduct DPIA for new customer-facing feature',
  'Gather data and draft annual compliance report',
  'Perform gap analysis against GDPR requirements',
  'Prepare documentation for upcoming certification audit',
  'Revise employee handbook with new policies',
  'Launch phishing simulation and awareness training',
  'Update BCP with new remote work scenarios',
  'Evaluate third-party vendors for security posture',
  'Roll out updated whistleblower reporting system',
  'Classify all company data assets by sensitivity level',
  'Review user permissions and remove unnecessary access'
];

const artifactTypes = ['DOCUMENT', 'EXCEL', 'PDF', 'CONTRACT', 'LEGAL', 'POLICY', 'PROCEDURE', 'REPORT'];

const mimeTypes: Record<string, string> = {
  DOCUMENT: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  EXCEL:    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  PDF:      'application/pdf',
  CONTRACT: 'application/pdf',
  LEGAL:    'application/pdf',
  POLICY:   'application/pdf',
  PROCEDURE:'application/pdf',
  REPORT:   'application/pdf'
};

const extensions: Record<string, string> = {
  DOCUMENT: '.docx',
  EXCEL:    '.xlsx',
  PDF:      '.pdf',
  CONTRACT: '.pdf',
  LEGAL:    '.pdf',
  POLICY:   '.pdf',
  PROCEDURE:'.pdf',
  REPORT:   '.pdf'
};

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
    console.log(`\n🌱 Starting to seed tasks & artifacts...\n`);

    // Get organizations
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

    console.log(`Found ${organizations.length} organizations to assign tasks to.`);

    let totalTasks = 0;
    let totalArtifacts = 0;

    for (const org of organizations) {
      console.log(`\nWorking on organization: ${org.name} (${org.id})`);

      const tasks = await Promise.all(
        Array.from({ length: TASKS_PER_ORG }).map(async () => {
          const taskName = randomItem(taskNames);
          const taskDesc = randomItem(descriptions);
          const startAt = randomPastDate();
          const endAt = randomFutureDate();

          const task = await prisma.task.create({
            data: {
              organizationId: org.id,
              name: taskName,
              description: taskDesc,
              expectedEvidence: 'Meeting minutes, signed attendance list, action plan',
              startAt,
              endAt,
              status: randomItem(['NOT_STARTED', 'OPEN', 'COMPLETED', 'CLOSED']),
              active: true,
            }
          });

          totalTasks++;

          // Create artifacts for this task
          const artifactCount = Math.floor(Math.random() * (ARTIFACTS_PER_TASK_AVG + 3)); // 0–5

          if (artifactCount > 0) {
            await Promise.all(
              Array.from({ length: artifactCount }).map(async () => {
                const type = randomItem(artifactTypes);
                const artifactName = `${taskName} - ${type.toLowerCase()} doc`;

                const artifact = await prisma.artifact.create({
                  data: {
                    organizationId: org.id,
                    name: artifactName,
                    description: `Supporting document for "${taskName}"`,
                    type,
                    mimeType: mimeTypes[type] || 'application/octet-stream',
                    extension: extensions[type] || '.bin',
                    size: (Math.floor(Math.random() * 12000) + 500).toString() + ' KB',
                    originalName: `${artifactName.replace(/ /g, '_')}${extensions[type] || '.pdf'}`,
                    active: true,
                  }
                });

                // Link artifact to task
                await prisma.taskArtifact.create({
                  data: {
                    taskId: task.id,
                    artifactId: artifact.id
                  }
                });

                totalArtifacts++;
              })
            );
          }

          return task;
        })
      );

      console.log(`  → Created ${tasks.length} tasks and ~${tasks.length * ARTIFACTS_PER_TASK_AVG} artifacts`);
    }

    console.log(`\n✅ Seeding completed:`);
    console.log(`   • Total tasks created:     ${totalTasks}`);
    console.log(`   • Total artifacts created: ${totalArtifacts}`);
    console.log(`   • Used ${organizations.length} organizations`);

    console.log('\n✨ Done! You can now browse tasks/artifacts in the app.');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedTasksAndArtifacts();