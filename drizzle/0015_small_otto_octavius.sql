PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_nutrition_profile` (
	`user_id` text PRIMARY KEY NOT NULL,
	`weight_kg` real NOT NULL,
	`height_cm` real NOT NULL,
	`gender` text NOT NULL,
	`age` integer NOT NULL,
	`activity_level` text DEFAULT 'sedentary' NOT NULL,
	`daily_calorie_goal` integer NOT NULL,
	`goal_mode` text DEFAULT 'estimated' NOT NULL,
	`eating_window_enabled` integer DEFAULT false NOT NULL,
	`eating_window_start` text DEFAULT '12:00' NOT NULL,
	`eating_window_end` text DEFAULT '20:00' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "nutritionProfile_weight_check" CHECK("__new_nutrition_profile"."weight_kg" >= 20 AND "__new_nutrition_profile"."weight_kg" <= 300),
	CONSTRAINT "nutritionProfile_height_check" CHECK("__new_nutrition_profile"."height_cm" >= 100 AND "__new_nutrition_profile"."height_cm" <= 250),
	CONSTRAINT "nutritionProfile_age_check" CHECK("__new_nutrition_profile"."age" >= 10 AND "__new_nutrition_profile"."age" <= 120),
	CONSTRAINT "nutritionProfile_calorieGoal_check" CHECK("__new_nutrition_profile"."daily_calorie_goal" >= 500 AND "__new_nutrition_profile"."daily_calorie_goal" <= 10000),
	CONSTRAINT "nutritionProfile_eatingWindowStart_check" CHECK("__new_nutrition_profile"."eating_window_start" GLOB '[01][0-9]:[0-5][0-9]' OR "__new_nutrition_profile"."eating_window_start" GLOB '2[0-3]:[0-5][0-9]'),
	CONSTRAINT "nutritionProfile_eatingWindowEnd_check" CHECK("__new_nutrition_profile"."eating_window_end" GLOB '[01][0-9]:[0-5][0-9]' OR "__new_nutrition_profile"."eating_window_end" GLOB '2[0-3]:[0-5][0-9]'),
	CONSTRAINT "nutritionProfile_eatingWindowOrder_check" CHECK("__new_nutrition_profile"."eating_window_start" < "__new_nutrition_profile"."eating_window_end")
);
--> statement-breakpoint
INSERT INTO `__new_nutrition_profile`("user_id", "weight_kg", "height_cm", "gender", "age", "activity_level", "daily_calorie_goal", "goal_mode", "eating_window_enabled", "eating_window_start", "eating_window_end", "created_at", "updated_at") SELECT "user_id", "weight_kg", "height_cm", "gender", "age", "activity_level", "daily_calorie_goal", "goal_mode", false, '12:00', '20:00', "created_at", "updated_at" FROM `nutrition_profile`;--> statement-breakpoint
DROP TABLE `nutrition_profile`;--> statement-breakpoint
ALTER TABLE `__new_nutrition_profile` RENAME TO `nutrition_profile`;--> statement-breakpoint
PRAGMA foreign_keys=ON;