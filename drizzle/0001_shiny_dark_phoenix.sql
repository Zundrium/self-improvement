CREATE TABLE `meditation_session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`local_date` text NOT NULL,
	`duration_seconds` integer NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `meditationSession_userId_localDate_idx` ON `meditation_session` (`user_id`,`local_date`);--> statement-breakpoint
CREATE INDEX `meditationSession_userId_completedAt_idx` ON `meditation_session` (`user_id`,`completed_at`);