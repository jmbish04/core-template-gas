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

export type ResearchFolderKey = keyof typeof RESEARCH_FOLDERS;
export type ResearchCategory = (typeof RESEARCH_FOLDERS)[ResearchFolderKey]["researchCategory"];

export interface ResearchFolderDefinition {
  folderId: string;
  researchCategory: ResearchCategory;
}
