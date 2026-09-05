import type { DatedData } from '$lib/trackers/model';

export type ChoresSession = { localDate: string; durationSeconds: number; startedAt: number };
export type ChoresData = DatedData & { session: ChoresSession | null };

export const CHORES_DURATION_SECONDS = 600 as const;
