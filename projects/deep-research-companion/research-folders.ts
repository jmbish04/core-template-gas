/**
 * Shared Google Drive source registry for both Apps Script and the paired
 * Cloudflare Worker. Add or change a folder here once; both runtimes consume
 * this exact module at build time.
 */
export const RESEARCH_FOLDERS = {
  general: {
    folderId: "1E-2gq4xYvKYp_svn13F1Er_PGJzXuuVC",
    researchCategory: "DEFAULT",
  },
  product: {
    folderId: "17ZeNvOHpXBXrn_lSRpYWjlVPROMEMJFa",
    researchCategory: "PRODUCT",
  },
  brand: {
    folderId: "1CblllJXtd1WmoJw8Molbe3rT3X9Kd3i5",
    researchCategory: "BRAND",
  },
  showroom: {
    folderId: "15NNC2IjjyA5X6nftSj8iaiFeCj1ht40Y",
    researchCategory: "SHOWROOM",
  },
} as const;

/** Shared non-category Drive/runtime defaults consumed by Apps Script and Worker builds. */
export const DEFAULT_LOG_FOLDER_ID = "12BeC-wUn63U8aS6TvrlLzjr0FMvReaSM";
export const DEFAULT_BACKFILL_FOLDER_ID = "1iPn2gYaVDY1RdNc-jvhDWEaoYuLGUNLB";
export const DEFAULT_TRACKING_SHEET_PROPERTY = "DEEP_RESEARCH_COMPANION_TRACKING_SHEET_ID";
export const DEFAULT_TRACKING_SHEET_ID = "1_VmTq_uOT44q3ny2QL0ptC4piDLc5J2qPyu_Mx78VYA";
export const DEFAULT_WORKER_BASE_URL = "https://gas-companion-research.hacolby.workers.dev";

export type ResearchFolderKey = keyof typeof RESEARCH_FOLDERS;
export type ResearchCategory = (typeof RESEARCH_FOLDERS)[ResearchFolderKey]["researchCategory"];

export interface ResearchFolderDefinition {
  folderId: string;
  researchCategory: ResearchCategory;
}
