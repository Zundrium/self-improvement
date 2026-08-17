CREATE TABLE `nutrition_entry` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`name` text DEFAULT 'Food entry' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`finalized_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "nutritionEntry_date_check" CHECK("nutrition_entry"."date" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);
--> statement-breakpoint
CREATE INDEX `nutritionEntry_userId_idx` ON `nutrition_entry` (`user_id`);--> statement-breakpoint
CREATE INDEX `nutritionEntry_userId_date_idx` ON `nutrition_entry` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `nutrition_ingredient` (
	`id` text PRIMARY KEY NOT NULL,
	`meal_id` text NOT NULL,
	`name` text NOT NULL,
	`quantity` real DEFAULT 1 NOT NULL,
	`unit` text DEFAULT 'serving' NOT NULL,
	`calories` real DEFAULT 0 NOT NULL,
	`protein_g` real DEFAULT 0 NOT NULL,
	`carbs_g` real DEFAULT 0 NOT NULL,
	`fat_g` real DEFAULT 0 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`meal_id`) REFERENCES `nutrition_meal`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "nutritionIngredient_quantity_check" CHECK("nutrition_ingredient"."quantity" >= 0),
	CONSTRAINT "nutritionIngredient_calories_check" CHECK("nutrition_ingredient"."calories" >= 0),
	CONSTRAINT "nutritionIngredient_protein_check" CHECK("nutrition_ingredient"."protein_g" >= 0),
	CONSTRAINT "nutritionIngredient_carbs_check" CHECK("nutrition_ingredient"."carbs_g" >= 0),
	CONSTRAINT "nutritionIngredient_fat_check" CHECK("nutrition_ingredient"."fat_g" >= 0)
);
--> statement-breakpoint
CREATE INDEX `nutritionIngredient_mealId_idx` ON `nutrition_ingredient` (`meal_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `nutritionIngredient_mealId_sortOrder_idx` ON `nutrition_ingredient` (`meal_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `nutrition_meal` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`name` text DEFAULT 'Meal' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`image_data_url` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `nutrition_entry`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `nutritionMeal_entryId_idx` ON `nutrition_meal` (`entry_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `nutritionMeal_entryId_sortOrder_idx` ON `nutrition_meal` (`entry_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `nutrition_profile` (
	`user_id` text PRIMARY KEY NOT NULL,
	`weight_kg` real NOT NULL,
	`height_cm` real NOT NULL,
	`gender` text NOT NULL,
	`age` integer NOT NULL,
	`activity_level` text DEFAULT 'sedentary' NOT NULL,
	`daily_calorie_goal` integer NOT NULL,
	`goal_mode` text DEFAULT 'estimated' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "nutritionProfile_weight_check" CHECK("nutrition_profile"."weight_kg" >= 20 AND "nutrition_profile"."weight_kg" <= 300),
	CONSTRAINT "nutritionProfile_height_check" CHECK("nutrition_profile"."height_cm" >= 100 AND "nutrition_profile"."height_cm" <= 250),
	CONSTRAINT "nutritionProfile_age_check" CHECK("nutrition_profile"."age" >= 10 AND "nutrition_profile"."age" <= 120),
	CONSTRAINT "nutritionProfile_calorieGoal_check" CHECK("nutrition_profile"."daily_calorie_goal" >= 500 AND "nutrition_profile"."daily_calorie_goal" <= 10000)
);
