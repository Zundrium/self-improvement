import { relations, sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import * as authSchema from './auth.schema';

export const gamificationProfile = sqliteTable(
	'gamification_profile',
	{
		userId: text('user_id')
			.primaryKey()
			.references(() => authSchema.user.id, { onDelete: 'cascade' }),
		startedLocalDate: text('started_local_date').notNull(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [
		check(
			'gamificationProfile_date_check',
			sql`${table.startedLocalDate} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`
		)
	]
);

export const gamificationAward = sqliteTable(
	'gamification_award',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => authSchema.user.id, { onDelete: 'cascade' }),
		trackerId: text('tracker_id').notNull(),
		localDate: text('local_date').notNull(),
		points: integer('points').notNull(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [
		uniqueIndex('gamificationAward_userTrackerDate_idx').on(
			table.userId,
			table.trackerId,
			table.localDate
		),
		index('gamificationAward_userDate_idx').on(table.userId, table.localDate),
		check('gamificationAward_points_check', sql`${table.points} BETWEEN 1 AND 1000`),
		check(
			'gamificationAward_date_check',
			sql`${table.localDate} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`
		)
	]
);

export const shopReward = sqliteTable(
	'shop_reward',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => authSchema.user.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		emoji: text('emoji').notNull().default('✨'),
		price: integer('price').notNull(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [
		index('shopReward_userId_idx').on(table.userId),
		check('shopReward_name_check', sql`length(${table.name}) BETWEEN 1 AND 80`),
		check('shopReward_emoji_check', sql`length(${table.emoji}) BETWEEN 1 AND 16`),
		check('shopReward_price_check', sql`${table.price} BETWEEN 1 AND 1000000`)
	]
);

export const shopRedemption = sqliteTable(
	'shop_redemption',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => authSchema.user.id, { onDelete: 'cascade' }),
		rewardId: text('reward_id').references(() => shopReward.id, { onDelete: 'set null' }),
		rewardName: text('reward_name').notNull(),
		rewardEmoji: text('reward_emoji').notNull(),
		price: integer('price').notNull(),
		redeemedAt: integer('redeemed_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [
		index('shopRedemption_userId_idx').on(table.userId),
		index('shopRedemption_rewardId_idx').on(table.rewardId),
		check('shopRedemption_price_check', sql`${table.price} BETWEEN 1 AND 1000000`)
	]
);

export const gamificationUserRelations = relations(authSchema.user, ({ many, one }) => ({
	gamificationProfile: one(gamificationProfile),
	gamificationAwards: many(gamificationAward),
	shopRewards: many(shopReward),
	shopRedemptions: many(shopRedemption)
}));

export const gamificationProfileRelations = relations(gamificationProfile, ({ one }) => ({
	user: one(authSchema.user, {
		fields: [gamificationProfile.userId],
		references: [authSchema.user.id]
	})
}));

export const gamificationAwardRelations = relations(gamificationAward, ({ one }) => ({
	user: one(authSchema.user, {
		fields: [gamificationAward.userId],
		references: [authSchema.user.id]
	})
}));

export const shopRewardRelations = relations(shopReward, ({ many, one }) => ({
	user: one(authSchema.user, { fields: [shopReward.userId], references: [authSchema.user.id] }),
	redemptions: many(shopRedemption)
}));

export const shopRedemptionRelations = relations(shopRedemption, ({ one }) => ({
	user: one(authSchema.user, {
		fields: [shopRedemption.userId],
		references: [authSchema.user.id]
	}),
	reward: one(shopReward, { fields: [shopRedemption.rewardId], references: [shopReward.id] })
}));

export type ShopReward = typeof shopReward.$inferSelect;
