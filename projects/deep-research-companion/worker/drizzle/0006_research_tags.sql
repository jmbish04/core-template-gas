CREATE TABLE `research_tag_defs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`timestamp` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`html_color` text DEFAULT '#64748b' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `research_tag_defs_name_unique` ON `research_tag_defs` (`name`);
--> statement-breakpoint
CREATE TABLE `research_tag_mapping` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`timestamp` integer NOT NULL,
	`research_item_id` text NOT NULL,
	`research_tag_id` integer NOT NULL,
	FOREIGN KEY (`research_item_id`) REFERENCES `research_documents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`research_tag_id`) REFERENCES `research_tag_defs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `research_tag_mapping_item_tag_unique` ON `research_tag_mapping` (`research_item_id`,`research_tag_id`);
--> statement-breakpoint
CREATE INDEX `research_tag_mapping_item_idx` ON `research_tag_mapping` (`research_item_id`);
