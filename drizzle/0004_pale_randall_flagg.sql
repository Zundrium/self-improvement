CREATE TABLE `step_connection` (
	`user_id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`time_zone` text DEFAULT 'UTC' NOT NULL,
	`daily_goal` integer DEFAULT 10000 NOT NULL,
	`app_version` text,
	`last_received_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "stepConnection_dailyGoal_check" CHECK("step_connection"."daily_goal" >= 1000 AND "step_connection"."daily_goal" <= 100000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stepConnection_tokenHash_idx` ON `step_connection` (`token_hash`);--> statement-breakpoint
CREATE TABLE `step_daily_total` (
	`user_id` text NOT NULL,
	`local_date` text NOT NULL,
	`count` integer NOT NULL,
	`source_start_at` integer NOT NULL,
	`source_end_at` integer NOT NULL,
	`synced_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`user_id`, `local_date`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "stepDailyTotal_count_check" CHECK("step_daily_total"."count" >= 0 AND "step_daily_total"."count" <= 1000000),
	CONSTRAINT "stepDailyTotal_date_check" CHECK("step_daily_total"."local_date" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);
--> statement-breakpoint
CREATE INDEX `stepDailyTotal_userId_localDate_idx` ON `step_daily_total` (`user_id`,`local_date`);