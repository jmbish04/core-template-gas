export type ResearchAssetType = 'REPORT' | 'WEB_APP';

export type {ResearchCategory, ResearchFolderDefinition} from '../../research-folders';
import type {ResearchCategory, ResearchFolderDefinition} from '../../research-folders';

export interface ProcessedAssetRecord {
  fileId: string;
  name: string;
  url: string;
  type: ResearchAssetType;
  researchCategory: ResearchCategory;
  dateCreated: Date;
  dateProcessed: Date;
  logFileUrl: string;
}

export interface PreviewFileSummary {
  id: string;
  name: string;
  date: number;
  dateString: string;
}

export interface RelatedDocumentCandidate {
  documentId: string;
  documentUrl: string;
  title: string;
  createdAt: string;
  modifiedAt?: string;
}

export interface DocumentIngestPayload {
  googleDocId: string;
  googleDocUrl: string;
  sourceTitle: string;
  researchCategory: ResearchCategory;
  markdown: string;
  createdAt: string;
  modifiedAt?: string;
  formattedLogUrl?: string;
  gatewayId: string;
}

export interface PwaIngestPayload {
  driveFileId: string;
  driveFileUrl: string;
  sourceTitle: string;
  researchCategory: ResearchCategory;
  html: string;
  createdAt: string;
  modifiedAt?: string;
  relatedDocumentCandidates: RelatedDocumentCandidate[];
  gatewayId: string;
}

export interface DocumentProcessResult {
  success: boolean;
  logUrl: string;
}

export interface ResearchWorkspaceConfig {
  researchFolders: ResearchFolderDefinition[];
  logFolderId: string;
  backfillFolderId: string;
  trackingSheetPropertyName: string;
  workerBaseUrl: string;
  workerApiKey: string;
  workerGatewayId: string;
}
