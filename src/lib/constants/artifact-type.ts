// lib/constants/artifact-type.ts
import { ArtifactType } from '@prisma/client';

export const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  [ArtifactType.DOCUMENT]:     'Document',
  [ArtifactType.EXCEL]:        'Excel',
  [ArtifactType.IMAGE]:        'Image',
  [ArtifactType.PRESENTATION]: 'Presentation',
  [ArtifactType.PDF]:          'PDF',
  [ArtifactType.CONTRACT]:     'Contract',
  [ArtifactType.LEGAL]:        'Legal',
  [ArtifactType.POLICY]:       'Policy',
  [ArtifactType.PROCEDURE]:    'Procedure',
  [ArtifactType.REPORT]:       'Report',
  [ArtifactType.VIDEO]:        'Video',
  [ArtifactType.AUDIO]:        'Audio',
  [ArtifactType.ARCHIVE]:      'Archive',
  [ArtifactType.DATA]:         'Data',
  [ArtifactType.SOURCE_CODE]:  'Source Code',
  [ArtifactType.OTHER]:        'Other',
} as const;

export const ARTIFACT_TYPES = Object.keys(ARTIFACT_TYPE_LABELS) as ArtifactType[];