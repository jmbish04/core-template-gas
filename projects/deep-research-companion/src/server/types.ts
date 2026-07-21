export type ResearchAssetType = 'REPORT' | 'WEB_APP';
export type ResearchCategory = 'DEFAULT' | 'PRODUCT' | 'BRAND';

export interface ProcessedAssetRecord {
  fileId: string;
  name: string;
  url: string;
  type: ResearchAssetType;
  category?: ResearchCategory;
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
}

export interface DocumentIngestPayload {
  googleDocId: string;
  googleDocUrl: string;
  sourceTitle: string;
  markdown: string;
  createdAt: string;
  formattedLogUrl?: string;
  gatewayId: string;
}

export interface PwaIngestPayload {
  driveFileId: string;
  driveFileUrl: string;
  sourceTitle: string;
  html: string;
  createdAt: string;
  relatedDocumentCandidates: RelatedDocumentCandidate[];
  gatewayId: string;
}

export interface DocumentProcessResult {
  success: boolean;
  logUrl: string;
}

export interface ResearchWorkspaceConfig {
  targetFolderId: string;
  productResearchFolderId: string;
  brandResearchFolderId: string;
  logFolderId: string;
  backfillFolderId: string;
  trackingSheetPropertyName: string;
  workerBaseUrl: string;
  workerApiKey: string;
  workerGatewayId: string;
}
