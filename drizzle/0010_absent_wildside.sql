CREATE TABLE `breathing_exercise` (
	`user_id` text NOT NULL,
	`local_date` text NOT NULL,
	`technique` text DEFAULT '4-7-8' NOT NULL,
	`duration_seconds` integer NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`user_id`, `local_date`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "breathingExercise_duration_check" CHECK("breathing_exercise"."duration_seconds" = 114),
	CONSTRAINT "breathingExercise_date_check" CHECK("breathing_exercise"."local_date" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);
