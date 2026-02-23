// lib/fs/utils.ts
import path from 'path';
import { prisma } from '@/lib/prisma';

export async function getValidatedOrgDirectories(orgId: string) {
  const settings = await prisma.organisationSettings.findUnique({
    where: { organizationId: orgId },
    select: { uploadDirectory: true, artifactDirectory: true },
  });

  if (!settings) {
    throw new Error('Organization settings not found');
  }

  const globalSettings = await prisma.settings.findFirst({
    select: { homeDirectory: true },
  });

  if (!globalSettings?.homeDirectory) {
    throw new Error('Global home directory not configured');
  }

  const home = path.resolve(globalSettings.homeDirectory);

  const uploadDir = path.resolve(settings.uploadDirectory);
  const artifactDir = path.resolve(settings.artifactDirectory);

  // Enforce: both must be inside homeDirectory
  if (!uploadDir.startsWith(home)) {
    throw new Error('uploadDirectory is not a sub-directory of homeDirectory');
  }

  if (!artifactDir.startsWith(home)) {
    throw new Error('artifactDirectory is not a sub-directory of homeDirectory');
  }

  // Optional: prevent them from being the same (or overlapping in unwanted ways)
  if (uploadDir === artifactDir) {
    throw new Error('uploadDirectory and artifactDirectory cannot be the same');
  }

  return {
    homeDir: home,
    uploadDir,
    artifactDir,
  };
}