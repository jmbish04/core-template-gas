CREATE TABLE `research_documents` (
  `id` text PRIMARY KEY NOT NULL,
  `google_doc_id` text NOT NULL,
  `google_doc_url` text NOT NULL,
  `source_title` text NOT NULL,
  `generated_title` text,
  `summary` text,
  `markdown` text NOT NULL,
  `tags_json` text DEFAULT '[]' NOT NULL,
  `formatted_log_url` text,
  `created_at` integer NOT NULL,
  `synced_at` integer NOT NULL
);
CREATE UNIQUE INDEX `research_documents_google_doc_id_unique` ON `research_documents` (`google_doc_id`);

CREATE TABLE `research_pwas` (
  `id` text PRIMARY KEY NOT NULL,
  `drive_file_id` text NOT NULL,
  `drive_file_url` text NOT NULL,
  `source_title` text NOT NULL,
  `generated_title` text,
  `summary` text,
  `tags_json` text DEFAULT '[]' NOT NULL,
  `r2_key` text NOT NULL,
  `related_google_doc_id` text,
  `gemini_api_target` text,
  `gemini_patched` integer DEFAULT false NOT NULL,
  `created_at` integer NOT NULL,
  `synced_at` integer NOT NULL
);
CREATE UNIQUE INDEX `research_pwas_drive_file_id_unique` ON `research_pwas` (`drive_file_id`);
