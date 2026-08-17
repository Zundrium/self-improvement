PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_step_connection` (
	`user_id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`time_zone` text DEFAULT 'UTC' NOT NULL,
	`daily_goal` integer DEFAULT 5000 NOT NULL,
	`app_version` text,
	`last_received_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "stepConnection_dailyGoal_check" CHECK("__new_step_connection"."daily_goal" >= 1000 AND "__new_step_connection"."daily_goal" <= 100000)
);
--> statement-breakpoint
INSERT INTO `__new_step_connection`("user_id", "token_hash", "time_zone", "daily_goal", "app_version", "last_received_at", "created_at", "updated_at") SELECT "user_id", "token_hash", "time_zone", CASE WHEN "daily_goal" = 10000 THEN 5000 ELSE "daily_goal" END, "app_version", "last_received_at", "created_at", "updated_at" FROM `step_connection`;--> statement-breakpoint
DROP TABLE `step_connection`;--> statement-breakpoint
ALTER TABLE `__new_step_connection` RENAME TO `step_connection`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `stepConnection_tokenHash_idx` ON `step_connection` (`token_hash`);