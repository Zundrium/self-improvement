PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_breathing_exercise` (
	`user_id` text NOT NULL,
	`local_date` text NOT NULL,
	`technique` text DEFAULT '4-7-8' NOT NULL,
	`duration_seconds` integer NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`user_id`, `local_date`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "breathingExercise_duration_check" CHECK("__new_breathing_exercise"."duration_seconds" IN (72, 114)),
	CONSTRAINT "breathingExercise_date_check" CHECK("__new_breathing_exercise"."local_date" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);
--> statement-breakpoint
INSERT INTO `__new_breathing_exercise`("user_id", "local_date", "technique", "duration_seconds", "started_at", "completed_at") SELECT "user_id", "local_date", "technique", "duration_seconds", "started_at", "completed_at" FROM `breathing_exercise`;--> statement-breakpoint
DROP TABLE `breathing_exercise`;--> statement-breakpoint
ALTER TABLE `__new_breathing_exercise` RENAME TO `breathing_exercise`;--> statement-breakpoint
PRAGMA foreign_keys=ON;