CREATE TABLE `screen_time_tracked_app` (
	`user_id` text NOT NULL,
	`package_name` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`user_id`, `package_name`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "screenTimeTrackedApp_packageName_check" CHECK(length("screen_time_tracked_app"."package_name") >= 1 AND length("screen_time_tracked_app"."package_name") <= 255)
);
