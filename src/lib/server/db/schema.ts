import { relations, sql } from 'drizzle-orm';
import {
	check,
	index,
	integer,
	real,
	sqliteTable,
	text,
	uniqueIndex
} from 'drizzle-orm/sqlite-core';
import * as authSchema from './auth.schema';

export * from './auth.schema';

export const meditationSession = sqliteTable(
	'meditation_session',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => authSchema.user.id, { onDelete: 'cascade' }),
		localDate: text('local_date').notNull(),
		durationSeconds: integer('duration_seconds').notNull(),
		startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
		completedAt: integer('completed_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [
		index('meditationSession_userId_localDate_idx').on(table.userId, table.localDate),
		index('meditationSession_userId_completedAt_idx').on(table.userId, table.completedAt)
	]
);

export const meditationSessionRelations = relations(meditationSession, ({ one }) => ({
	user: one(authSchema.user, {
		fields: [meditationSession.userId],
		references: [authSchema.user.id]
	})
}));

export const nutritionProfile = sqliteTable(
	'nutrition_profile',
	{
		userId: text('user_id')
			.primaryKey()
			.references(() => authSchema.user.id, { onDelete: 'cascade' }),
		weightKg: real('weight_kg').notNull(),
		heightCm: real('height_cm').notNull(),
		gender: text('gender', { enum: ['male', 'female'] }).notNull(),
		age: integer('age').notNull(),
		activityLevel: text('activity_level', {
			enum: ['sedentary', 'light', 'moderate', 'active', 'very_active']
		})
			.notNull()
			.default('sedentary'),
		dailyCalorieGoal: integer('daily_calorie_goal').notNull(),
		goalMode: text('goal_mode', { enum: ['estimated', 'custom'] })
			.notNull()
			.default('estimated'),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [
		check(
			'nutritionProfile_weight_check',
			sql`${table.weightKg} >= 20 AND ${table.weightKg} <= 300`
		),
		check(
			'nutritionProfile_height_check',
			sql`${table.heightCm} >= 100 AND ${table.heightCm} <= 250`
		),
		check('nutritionProfile_age_check', sql`${table.age} >= 10 AND ${table.age} <= 120`),
		check(
			'nutritionProfile_calorieGoal_check',
			sql`${table.dailyCalorieGoal} >= 500 AND ${table.dailyCalorieGoal} <= 10000`
		)
	]
);

export const nutritionEntry = sqliteTable(
	'nutrition_entry',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => authSchema.user.id, { onDelete: 'cascade' }),
		date: text('date').notNull(),
		name: text('name').notNull().default('Food entry'),
		notes: text('notes').notNull().default(''),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		finalizedAt: integer('finalized_at', { mode: 'timestamp_ms' })
	},
	(table) => [
		index('nutritionEntry_userId_idx').on(table.userId),
		index('nutritionEntry_userId_date_idx').on(table.userId, table.date),
		check(
			'nutritionEntry_date_check',
			sql`${table.date} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`
		)
	]
);

export const nutritionMeal = sqliteTable(
	'nutrition_meal',
	{
		id: text('id').primaryKey(),
		entryId: text('entry_id')
			.notNull()
			.references(() => nutritionEntry.id, { onDelete: 'cascade' }),
		name: text('name').notNull().default('Meal'),
		notes: text('notes').notNull().default(''),
		imageDataUrl: text('image_data_url').notNull().default(''),
		sortOrder: integer('sort_order').notNull().default(0),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [
		index('nutritionMeal_entryId_idx').on(table.entryId),
		uniqueIndex('nutritionMeal_entryId_sortOrder_idx').on(table.entryId, table.sortOrder)
	]
);

export const nutritionIngredient = sqliteTable(
	'nutrition_ingredient',
	{
		id: text('id').primaryKey(),
		mealId: text('meal_id')
			.notNull()
			.references(() => nutritionMeal.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		quantity: real('quantity').notNull().default(1),
		unit: text('unit').notNull().default('serving'),
		calories: real('calories').notNull().default(0),
		proteinG: real('protein_g').notNull().default(0),
		carbsG: real('carbs_g').notNull().default(0),
		fatG: real('fat_g').notNull().default(0),
		notes: text('notes').notNull().default(''),
		sortOrder: integer('sort_order').notNull().default(0),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull()
	},
	(table) => [
		index('nutritionIngredient_mealId_idx').on(table.mealId),
		uniqueIndex('nutritionIngredient_mealId_sortOrder_idx').on(table.mealId, table.sortOrder),
		check('nutritionIngredient_quantity_check', sql`${table.quantity} >= 0`),
		check('nutritionIngredient_calories_check', sql`${table.calories} >= 0`),
		check('nutritionIngredient_protein_check', sql`${table.proteinG} >= 0`),
		check('nutritionIngredient_carbs_check', sql`${table.carbsG} >= 0`),
		check('nutritionIngredient_fat_check', sql`${table.fatG} >= 0`)
	]
);

export const nutritionUserRelations = relations(authSchema.user, ({ many, one }) => ({
	nutritionProfile: one(nutritionProfile),
	nutritionEntries: many(nutritionEntry)
}));

export const nutritionProfileRelations = relations(nutritionProfile, ({ one }) => ({
	user: one(authSchema.user, {
		fields: [nutritionProfile.userId],
		references: [authSchema.user.id]
	})
}));

export const nutritionEntryRelations = relations(nutritionEntry, ({ many, one }) => ({
	user: one(authSchema.user, {
		fields: [nutritionEntry.userId],
		references: [authSchema.user.id]
	}),
	meals: many(nutritionMeal)
}));

export const nutritionMealRelations = relations(nutritionMeal, ({ many, one }) => ({
	entry: one(nutritionEntry, {
		fields: [nutritionMeal.entryId],
		references: [nutritionEntry.id]
	}),
	ingredients: many(nutritionIngredient)
}));

export const nutritionIngredientRelations = relations(nutritionIngredient, ({ one }) => ({
	meal: one(nutritionMeal, {
		fields: [nutritionIngredient.mealId],
		references: [nutritionMeal.id]
	})
}));

export type NutritionProfile = typeof nutritionProfile.$inferSelect;
export type NutritionEntry = typeof nutritionEntry.$inferSelect;
export type NutritionMeal = typeof nutritionMeal.$inferSelect;
export type NutritionIngredient = typeof nutritionIngredient.$inferSelect;

export const schema = {
	...authSchema,
	meditationSession,
	meditationSessionRelations,
	nutritionProfile,
	nutritionEntry,
	nutritionMeal,
	nutritionIngredient,
	nutritionUserRelations,
	nutritionProfileRelations,
	nutritionEntryRelations,
	nutritionMealRelations,
	nutritionIngredientRelations
};
