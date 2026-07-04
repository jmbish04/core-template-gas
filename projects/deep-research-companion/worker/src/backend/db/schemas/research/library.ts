import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const researchDocuments = sqliteTable("research_documents", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  googleDocId: text("google_doc_id").notNull().unique(),
  googleDocUrl: text("google_doc_url").notNull(),
  sourceTitle: text("source_title").notNull(),
  generatedTitle: text("generated_title"),
  summary: text("summary"),
  markdown: text("markdown").notNull(),
  tagsJson: text("tags_json").notNull().default("[]"),
  formattedLogUrl: text("formatted_log_url"),
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
  generatedTitle: text("generated_title"),
  summary: text("summary"),
  tagsJson: text("tags_json").notNull().default("[]"),
  r2Key: text("r2_key").notNull(),
  relatedGoogleDocId: text("related_google_doc_id"),
  geminiApiTarget: text("gemini_api_target"),
  geminiPatched: integer("gemini_patched", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  syncedAt: integer("synced_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const insertResearchDocumentSchema = createInsertSchema(researchDocuments);
export const selectResearchDocumentSchema = createSelectSchema(researchDocuments);
export const insertResearchPwaSchema = createInsertSchema(researchPwas);
export const selectResearchPwaSchema = createSelectSchema(researchPwas);

export type ResearchDocument = typeof researchDocuments.$inferSelect;
export type NewResearchDocument = typeof researchDocuments.$inferInsert;
export type ResearchPwa = typeof researchPwas.$inferSelect;
export type NewResearchPwa = typeof researchPwas.$inferInsert;
