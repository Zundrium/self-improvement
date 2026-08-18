ALTER TABLE `screen_time_connection` ADD `companion_token_hash` text;--> statement-breakpoint
ALTER TABLE `screen_time_connection` ADD `companion_time_zone` text;--> statement-breakpoint
CREATE UNIQUE INDEX `screenTimeConnection_companionTokenHash_idx` ON `screen_time_connection` (`companion_token_hash`);--> statement-breakpoint
ALTER TABLE `sleep_connection` ADD `companion_token_hash` text;--> statement-breakpoint
ALTER TABLE `sleep_connection` ADD `companion_time_zone` text;--> statement-breakpoint
CREATE UNIQUE INDEX `sleepConnection_companionTokenHash_idx` ON `sleep_connection` (`companion_token_hash`);--> statement-breakpoint
ALTER TABLE `step_connection` ADD `companion_token_hash` text;--> statement-breakpoint
ALTER TABLE `step_connection` ADD `companion_time_zone` text;--> statement-breakpoint
CREATE UNIQUE INDEX `stepConnection_companionTokenHash_idx` ON `step_connection` (`companion_token_hash`);