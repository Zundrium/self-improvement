CREATE TABLE `sleep_daily_adherence` (
	`user_id` text NOT NULL,
	`local_date` text NOT NULL,
	`configured_bedtime` text NOT NULL,
	`window_start_at` integer NOT NULL,
	`window_end_at` integer NOT NULL,
	`late_usage_seconds` integer NOT NULL,
	`latest_screen_activity_at` integer,
	`used_apps` text NOT NULL,
	`violating_apps` text NOT NULL,
	`status` text NOT NULL,
	`source_timestamp` integer NOT NULL,
	`synced_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`user_id`, `local_date`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "sleepDailyAdherence_date_check" CHECK("sleep_daily_adherence"."local_date" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
	CONSTRAINT "sleepDailyAdherence_bedtime_check" CHECK("sleep_daily_adherence"."configured_bedtime" GLOB '[0-2][0-9]:[0-5][0-9]' AND substr("sleep_daily_adherence"."configured_bedtime", 1, 2) <= '23'),
	CONSTRAINT "sleepDailyAdherence_window_check" CHECK("sleep_daily_adherence"."window_end_at" - "sleep_daily_adherence"."window_start_at" = 14400000),
	CONSTRAINT "sleepDailyAdherence_lateUsage_check" CHECK("sleep_daily_adherence"."late_usage_seconds" BETWEEN 0 AND 1440000),
	CONSTRAINT "sleepDailyAdherence_usedApps_check" CHECK(json_valid("sleep_daily_adherence"."used_apps") AND json_type("sleep_daily_adherence"."used_apps") = 'array'),
	CONSTRAINT "sleepDailyAdherence_violatingApps_check" CHECK(json_valid("sleep_daily_adherence"."violating_apps") AND json_type("sleep_daily_adherence"."violating_apps") = 'array'),
	CONSTRAINT "sleepDailyAdherence_status_check" CHECK("sleep_daily_adherence"."status" IN ('pending', 'pass', 'fail'))
);
--> statement-breakpoint
CREATE INDEX `sleepDailyAdherence_userId_localDate_idx` ON `sleep_daily_adherence` (`user_id`,`local_date`);--> statement-breakpoint
CREATE TABLE `sleep_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`bedtime` text DEFAULT '22:30' NOT NULL,
	`reminders_enabled` integer DEFAULT false NOT NULL,
	`time_zone` text DEFAULT 'UTC' NOT NULL,
	`app_version` text,
	`last_received_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "sleepSettings_bedtime_check" CHECK("sleep_settings"."bedtime" GLOB '[0-2][0-9]:[0-5][0-9]' AND substr("sleep_settings"."bedtime", 1, 2) <= '23'),
	CONSTRAINT "sleepSettings_timeZone_check" CHECK(length("sleep_settings"."time_zone") BETWEEN 1 AND 100),
	CONSTRAINT "sleepSettings_appVersion_check" CHECK("sleep_settings"."app_version" IS NULL OR length("sleep_settings"."app_version") BETWEEN 1 AND 40)
);
--> statement-breakpoint
DROP TABLE `sleep_connection`;--> statement-breakpoint
DROP TABLE `sleep_session`;