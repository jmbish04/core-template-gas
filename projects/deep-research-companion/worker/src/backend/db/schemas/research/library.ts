import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const researchDocuments = sqliteTable("research_documents", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  googleDocId: text("google_doc_id").notNull().unique(),
  googleDocUrl: text("google_doc_url").notNull(),
  sourceTitle: text("source_title").notNull(),
  researchCategory: text("research_category").notNull().default("DEFAULT"),
  generatedTitle: text("generated_title"),
  summary: text("summary"),
  markdown: text("markdown").notNull(),
  tagsJson: text("tags_json").notNull().default("[]"),
  formattedLogUrl: text("formatted_log_url"),
  driveModifiedAt: integer("drive_modified_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  syncedAt: integer("synced_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const researchPwas = sqliteTable("research_pwas", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  driveFileId: text("drive_file_id").notNull().unique(),
  driveFileUrl: text("drive_file_url").notNull(),
  sourceTitle: text("source_title").notNull(),
  researchCategory: text("research_category").notNull().default("DEFAULT"),
  generatedTitle: text("generated_title"),
  summary: text("summary"),
  tagsJson: text("tags_json").notNull().default("[]"),
  r2Key: text("r2_key").notNull(),
  relatedGoogleDocId: text("related_google_doc_id"),
  relationSource: text("relation_source").notNull().default("UNMAPPED"),
  relationConfidence: integer("relation_confidence"),
  driveModifiedAt: integer("drive_modified_at", { mode: "timestamp" }),
  geminiApiTarget: text("gemini_api_target"),
  geminiPatched: integer("gemini_patched", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  syncedAt: integer("synced_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
}, (table) => [
  uniqueIndex("research_pwas_related_google_doc_id_unique").on(table.relatedGoogleDocId),
]);

/** User-managed tag definitions shown throughout the research archive. */
export const researchTagDefs = sqliteTable("research_tag_defs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  timestamp: integer("timestamp", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  htmlColor: text("html_color").notNull().default("#64748b"),
}, (table) => [uniqueIndex("research_tag_defs_name_unique").on(table.name)]);

/** Many-to-many tag assignments for Google research documents. */
export const researchTagMappings = sqliteTable("research_tag_mapping", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  timestamp: integer("timestamp", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  researchItemId: text("research_item_id")
    .notNull()
    .references(() => researchDocuments.id, { onDelete: "cascade" }),
  researchTagId: integer("research_tag_id")
    .notNull()
    .references(() => researchTagDefs.id, { onDelete: "cascade" }),
}, (table) => [
  uniqueIndex("research_tag_mapping_item_tag_unique").on(table.researchItemId, table.researchTagId),
  index("research_tag_mapping_item_idx").on(table.researchItemId),
]);

export const insertResearchDocumentSchema = createInsertSchema(researchDocuments);
export const selectResearchDocumentSchema = createSelectSchema(researchDocuments);
export const insertResearchPwaSchema = createInsertSchema(researchPwas);
export const selectResearchPwaSchema = createSelectSchema(researchPwas);
export const insertResearchTagDefSchema = createInsertSchema(researchTagDefs);
export const selectResearchTagDefSchema = createSelectSchema(researchTagDefs);

export type ResearchDocument = typeof researchDocuments.$inferSelect;
export type NewResearchDocument = typeof researchDocuments.$inferInsert;
export type ResearchPwa = typeof researchPwas.$inferSelect;
export type NewResearchPwa = typeof researchPwas.$inferInsert;
export type ResearchTagDef = typeof researchTagDefs.$inferSelect;
