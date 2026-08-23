CREATE TABLE `nutrition_fasting_day` (
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`user_id`, `date`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "nutritionFastingDay_date_check" CHECK("nutrition_fasting_day"."date" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);
--> statement-breakpoint
CREATE TRIGGER `nutritionFastingDay_noEntries_insert`
BEFORE INSERT ON `nutrition_fasting_day`
WHEN EXISTS (
	SELECT 1 FROM `nutrition_entry`
	WHERE `nutrition_entry`.`user_id` = NEW.`user_id`
		AND `nutrition_entry`.`date` = NEW.`date`
)
BEGIN
	SELECT RAISE(ABORT, 'nutrition fasting day has meals');
END;
--> statement-breakpoint
CREATE TRIGGER `nutritionFastingDay_noEntries_update`
BEFORE UPDATE OF `user_id`, `date` ON `nutrition_fasting_day`
WHEN EXISTS (
	SELECT 1 FROM `nutrition_entry`
	WHERE `nutrition_entry`.`user_id` = NEW.`user_id`
		AND `nutrition_entry`.`date` = NEW.`date`
)
BEGIN
	SELECT RAISE(ABORT, 'nutrition fasting day has meals');
END;
--> statement-breakpoint
CREATE TRIGGER `nutritionEntry_noFastingDay_insert`
BEFORE INSERT ON `nutrition_entry`
WHEN EXISTS (
	SELECT 1 FROM `nutrition_fasting_day`
	WHERE `nutrition_fasting_day`.`user_id` = NEW.`user_id`
		AND `nutrition_fasting_day`.`date` = NEW.`date`
)
BEGIN
	SELECT RAISE(ABORT, 'nutrition day is fasting');
END;
--> statement-breakpoint
CREATE TRIGGER `nutritionEntry_noFastingDay_update`
BEFORE UPDATE OF `user_id`, `date` ON `nutrition_entry`
WHEN EXISTS (
	SELECT 1 FROM `nutrition_fasting_day`
	WHERE `nutrition_fasting_day`.`user_id` = NEW.`user_id`
		AND `nutrition_fasting_day`.`date` = NEW.`date`
)
BEGIN
	SELECT RAISE(ABORT, 'nutrition day is fasting');
END;
