CREATE TABLE `happiness_entry` (
	`user_id` text NOT NULL,
	`local_date` text NOT NULL,
	`rating` integer NOT NULL,
	`reasons` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`user_id`, `local_date`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "happinessEntry_rating_check" CHECK("happiness_entry"."rating" BETWEEN 1 AND 5),
	CONSTRAINT "happinessEntry_date_check" CHECK("happiness_entry"."local_date" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);
