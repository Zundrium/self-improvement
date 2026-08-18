CREATE TABLE `screen_time_connection` (
	`user_id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`time_zone` text DEFAULT 'UTC' NOT NULL,
	`app_version` text,
	`device` text,
	`source` text,
	`last_received_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `screenTimeConnection_tokenHash_idx` ON `screen_time_connection` (`token_hash`);--> statement-breakpoint
CREATE TABLE `screen_time_daily_snapshot` (
	`user_id` text NOT NULL,
	`local_date` text NOT NULL,
	`total_minutes` integer NOT NULL,
	`apps` text NOT NULL,
	`source_timestamp` integer NOT NULL,
	`synced_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`user_id`, `local_date`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "screenTimeDailySnapshot_totalMinutes_check" CHECK("screen_time_daily_snapshot"."total_minutes" >= 0 AND "screen_time_daily_snapshot"."total_minutes" <= 1440),
	CONSTRAINT "screenTimeDailySnapshot_date_check" CHECK("screen_time_daily_snapshot"."local_date" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
	CONSTRAINT "screenTimeDailySnapshot_apps_check" CHECK(json_valid("screen_time_daily_snapshot"."apps"))
);
--> statement-breakpoint
CREATE INDEX `screenTimeDailySnapshot_userId_localDate_idx` ON `screen_time_daily_snapshot` (`user_id`,`local_date`);--> statement-breakpoint
CREATE TABLE `sleep_connection` (
	`user_id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`time_zone` text DEFAULT 'UTC' NOT NULL,
	`daily_goal_minutes` integer DEFAULT 420 NOT NULL,
	`app_version` text,
	`last_received_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "sleepConnection_tokenHash_check" CHECK(length("sleep_connection"."token_hash") = 64),
	CONSTRAINT "sleepConnection_timeZone_check" CHECK(length("sleep_connection"."time_zone") BETWEEN 1 AND 100),
	CONSTRAINT "sleepConnection_dailyGoalMinutes_check" CHECK("sleep_connection"."daily_goal_minutes" BETWEEN 60 AND 1440),
	CONSTRAINT "sleepConnection_appVersion_check" CHECK("sleep_connection"."app_version" IS NULL OR length("sleep_connection"."app_version") BETWEEN 1 AND 40)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sleepConnection_tokenHash_idx` ON `sleep_connection` (`token_hash`);--> statement-breakpoint
CREATE TABLE `sleep_session` (
	`user_id` text NOT NULL,
	`session_end_at` integer NOT NULL,
	`session_start_at` integer NOT NULL,
	`local_date` text NOT NULL,
	`session_duration_seconds` integer NOT NULL,
	`sleep_duration_seconds` integer NOT NULL,
	`stages` text NOT NULL,
	`data_origin` text,
	`synced_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`user_id`, `session_end_at`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "sleepSession_date_check" CHECK("sleep_session"."local_date" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
	CONSTRAINT "sleepSession_sessionDuration_check" CHECK("sleep_session"."session_duration_seconds" BETWEEN 1 AND 129600),
	CONSTRAINT "sleepSession_sleepDuration_check" CHECK("sleep_session"."sleep_duration_seconds" BETWEEN 0 AND "sleep_session"."session_duration_seconds"),
	CONSTRAINT "sleepSession_interval_check" CHECK("sleep_session"."session_start_at" < "sleep_session"."session_end_at" AND "sleep_session"."session_end_at" - "sleep_session"."session_start_at" = "sleep_session"."session_duration_seconds" * 1000),
	CONSTRAINT "sleepSession_stages_check" CHECK(json_valid("sleep_session"."stages") AND json_type("sleep_session"."stages") = 'array' AND json_array_length("sleep_session"."stages") <= 200),
	CONSTRAINT "sleepSession_dataOrigin_check" CHECK("sleep_session"."data_origin" IS NULL OR length("sleep_session"."data_origin") <= 255)
);
--> statement-breakpoint
CREATE INDEX `sleepSession_userId_localDate_idx` ON `sleep_session` (`user_id`,`local_date`);