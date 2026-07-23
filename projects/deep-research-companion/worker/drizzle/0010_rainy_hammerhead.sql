CREATE TABLE `appsscript_logger_errors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`logger_file_id` integer NOT NULL,
	`errors_array_index_number` integer NOT NULL,
	`entire_errors_array_` text NOT NULL,
	FOREIGN KEY (`logger_file_id`) REFERENCES `appsscript_logger_files`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `appsscript_logger_errors_file_index_unique` ON `appsscript_logger_errors` (`logger_file_id`,`errors_array_index_number`);--> statement-breakpoint
CREATE INDEX `appsscript_logger_errors_file_idx` ON `appsscript_logger_errors` (`logger_file_id`);--> statement-breakpoint
CREATE TABLE `appsscript_logger_files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`timestamp` integer NOT NULL,
	`json_file_name` text NOT NULL,
	`drive_id` text NOT NULL,
	`drive_url` text NOT NULL,
	`drive_folder_id` text NOT NULL,
	`document_id` text NOT NULL,
	`document_title` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `appsscript_logger_files_drive_id_unique` ON `appsscript_logger_files` (`drive_id`);--> statement-breakpoint
CREATE TABLE `appsscript_logger_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`logger_file_id` integer NOT NULL,
	`elements_array_index_number` integer NOT NULL,
	`type` text,
	`snippet` text,
	`full_json_object` text NOT NULL,
	FOREIGN KEY (`logger_file_id`) REFERENCES `appsscript_logger_files`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `appsscript_logger_lines_file_index_unique` ON `appsscript_logger_lines` (`logger_file_id`,`elements_array_index_number`);--> statement-breakpoint
CREATE INDEX `appsscript_logger_lines_file_idx` ON `appsscript_logger_lines` (`logger_file_id`);
