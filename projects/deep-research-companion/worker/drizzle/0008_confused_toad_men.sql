ALTER TABLE `research_documents` ADD `drive_modified_at` integer;--> statement-breakpoint
ALTER TABLE `research_pwas` ADD `relation_source` text DEFAULT 'UNMAPPED' NOT NULL;--> statement-breakpoint
ALTER TABLE `research_pwas` ADD `relation_confidence` integer;--> statement-breakpoint
ALTER TABLE `research_pwas` ADD `drive_modified_at` integer;--> statement-breakpoint
UPDATE `research_pwas` SET `relation_source` = 'AUTO' WHERE `related_google_doc_id` IS NOT NULL;
