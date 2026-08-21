import { and, asc, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { shopRedemption, shopReward } from '$lib/server/db/schema';
import type { Database } from '$lib/server/db';
import { loadGamification } from './gamification';

const rewardSchema = z.object({
	name: z.string().trim().min(1).max(80),
	emoji: z.string().trim().min(1).max(16),
	price: z.number().int().min(1).max(1_000_000)
});

export class RewardNotFoundError extends Error {}
export class InsufficientGlimmersError extends Error {}

export async function loadRewardsData(db: Database, userId: string) {
	const gamification = await loadGamification(db, userId);
	const [rewards, redemptions] = await Promise.all([
		listRewards(db, userId),
		listRecentRedemptions(db, userId)
	]);
	return { today: gamification.today, glimmers: gamification.glimmers, rewards, redemptions };
}

export async function listRewards(db: Database, userId: string) {
	return db
		.select({
			id: shopReward.id,
			name: shopReward.name,
			emoji: shopReward.emoji,
			price: shopReward.price
		})
		.from(shopReward)
		.where(eq(shopReward.userId, userId))
		.orderBy(asc(shopReward.price), asc(shopReward.createdAt));
}

export async function createReward(db: Database, userId: string, input: unknown) {
	const reward = rewardSchema.parse(input);
	const [created] = await db
		.insert(shopReward)
		.values({ id: crypto.randomUUID(), userId, ...reward })
		.returning({
			id: shopReward.id,
			name: shopReward.name,
			emoji: shopReward.emoji,
			price: shopReward.price
		});
	return created;
}

export async function updateReward(db: Database, userId: string, rewardId: string, input: unknown) {
	const reward = rewardSchema.parse(input);
	const [updated] = await db
		.update(shopReward)
		.set({ ...reward, updatedAt: new Date() })
		.where(and(eq(shopReward.id, rewardId), eq(shopReward.userId, userId)))
		.returning({
			id: shopReward.id,
			name: shopReward.name,
			emoji: shopReward.emoji,
			price: shopReward.price
		});
	if (!updated) throw new RewardNotFoundError('Reward not found.');
	return updated;
}

export async function deleteReward(db: Database, userId: string, rewardId: string) {
	const deleted = await db
		.delete(shopReward)
		.where(and(eq(shopReward.id, rewardId), eq(shopReward.userId, userId)))
		.returning({ id: shopReward.id });
	if (!deleted.length) throw new RewardNotFoundError('Reward not found.');
}

export async function redeemReward(db: Database, userId: string, rewardId: string) {
	const reward = await findReward(db, userId, rewardId);
	const gamification = await loadGamification(db, userId);
	if (gamification.glimmers < reward.price) {
		throw new InsufficientGlimmersError('You need more Glimmers for this reward.');
	}
	await db.insert(shopRedemption).values({
		id: crypto.randomUUID(),
		userId,
		rewardId: reward.id,
		rewardName: reward.name,
		rewardEmoji: reward.emoji,
		price: reward.price
	});
	return { reward, glimmers: gamification.glimmers - reward.price };
}

async function findReward(db: Database, userId: string, rewardId: string) {
	const [reward] = await db
		.select({
			id: shopReward.id,
			name: shopReward.name,
			emoji: shopReward.emoji,
			price: shopReward.price
		})
		.from(shopReward)
		.where(and(eq(shopReward.id, rewardId), eq(shopReward.userId, userId)))
		.limit(1);
	if (!reward) throw new RewardNotFoundError('Reward not found.');
	return reward;
}

async function listRecentRedemptions(db: Database, userId: string) {
	const rows = await db
		.select({
			id: shopRedemption.id,
			name: shopRedemption.rewardName,
			emoji: shopRedemption.rewardEmoji,
			price: shopRedemption.price,
			redeemedAt: shopRedemption.redeemedAt
		})
		.from(shopRedemption)
		.where(eq(shopRedemption.userId, userId))
		.orderBy(desc(shopRedemption.redeemedAt))
		.limit(5);
	return rows.map((redemption) => ({
		...redemption,
		redeemedAt: redemption.redeemedAt.toISOString()
	}));
}
