CREATE TABLE `gamification_award` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`tracker_id` text NOT NULL,
	`local_date` text NOT NULL,
	`points` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "gamificationAward_points_check" CHECK("gamification_award"."points" BETWEEN 1 AND 1000),
	CONSTRAINT "gamificationAward_date_check" CHECK("gamification_award"."local_date" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gamificationAward_userTrackerDate_idx` ON `gamification_award` (`user_id`,`tracker_id`,`local_date`);--> statement-breakpoint
CREATE INDEX `gamificationAward_userDate_idx` ON `gamification_award` (`user_id`,`local_date`);--> statement-breakpoint
CREATE TABLE `gamification_profile` (
	`user_id` text PRIMARY KEY NOT NULL,
	`started_local_date` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "gamificationProfile_date_check" CHECK("gamification_profile"."started_local_date" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);
--> statement-breakpoint
CREATE TABLE `shop_redemption` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`reward_id` text,
	`reward_name` text NOT NULL,
	`reward_emoji` text NOT NULL,
	`price` integer NOT NULL,
	`redeemed_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reward_id`) REFERENCES `shop_reward`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "shopRedemption_price_check" CHECK("shop_redemption"."price" BETWEEN 1 AND 1000000)
);
--> statement-breakpoint
CREATE INDEX `shopRedemption_userId_idx` ON `shop_redemption` (`user_id`);--> statement-breakpoint
CREATE INDEX `shopRedemption_rewardId_idx` ON `shop_redemption` (`reward_id`);--> statement-breakpoint
CREATE TABLE `shop_reward` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`emoji` text DEFAULT '✨' NOT NULL,
	`price` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "shopReward_name_check" CHECK(length("shop_reward"."name") BETWEEN 1 AND 80),
	CONSTRAINT "shopReward_emoji_check" CHECK(length("shop_reward"."emoji") BETWEEN 1 AND 16),
	CONSTRAINT "shopReward_price_check" CHECK("shop_reward"."price" BETWEEN 1 AND 1000000)
);
--> statement-breakpoint
CREATE INDEX `shopReward_userId_idx` ON `shop_reward` (`user_id`);