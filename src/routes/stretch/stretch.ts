import {
	DEFAULT_STRETCH_DIFFICULTIES,
	STRETCH_DIFFICULTIES,
	type StretchActivityId,
	type StretchDifficulties,
	type StretchDifficulty
} from '$lib/local/tracker-settings';

export const STRETCH_VIDEO_URL = 'https://www.youtube.com/watch?v=QaKuVOhikaY';
export const STRETCH_SETS_PER_DAY = 2;
export const STRETCH_REST_SECONDS = 10;
export const WALL_ANGEL_REPS = 10;

export type StretchImageVariant = {
	id: StretchDifficulty;
	label: string;
	imageUrl: string;
};

export type StretchStep = {
	id: StretchActivityId;
	name: string;
	position: string;
	cue: string;
	imageUrl: string;
	imageVariants: StretchImageVariant[];
	selectedImageVariantId: StretchDifficulty;
	durationSeconds: number | null;
	sets: number;
};

export type StretchCompletion = {
	localDate: string;
	holdSeconds: number;
};

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function stretchSteps(
	holdSeconds: number,
	difficulties: StretchDifficulties = DEFAULT_STRETCH_DIFFICULTIES
): StretchStep[] {
	return [
		stretch(
			'pancake',
			'Pancake stretch',
			'Center',
			'Sit high if needed, spread your legs, arch your back, and hinge forward from your hips.',
			holdSeconds
		),
		stretch(
			'figure-four-left',
			'Figure-four stretch',
			'Left side',
			'Cross your left ankle over your right thigh and lean forward with a long spine.',
			holdSeconds
		),
		stretch(
			'figure-four-right',
			'Figure-four stretch',
			'Right side',
			'Cross your right ankle over your left thigh and lean forward with a long spine.',
			holdSeconds
		),
		stretch(
			'lunge-left',
			'Hip-flexor stretch',
			'Left side',
			'Keep your hips facing forward, sink into the lunge, then reach up and over.',
			holdSeconds
		),
		stretch(
			'lunge-right',
			'Hip-flexor stretch',
			'Right side',
			'Keep your hips facing forward, sink into the lunge, then reach up and over.',
			holdSeconds
		),
		stretch(
			'chest',
			'Jack stretch',
			'Broom pole or belt',
			'Lift your chest, hold the support behind your shoulders, and press your arms backward.',
			holdSeconds
		),
		stretch(
			'lat',
			'Lat stretch',
			'Choose your level',
			'Reach long through your arms and sit your hips back until you feel your lats lengthen.',
			holdSeconds
		),
		stretch(
			'wall-angels',
			'Wall angels',
			`${WALL_ANGEL_REPS} slow reps`,
			'Keep your ribs and back against the wall while your elbows and wrists move toward it.',
			null,
			1
		)
	].map((step) => withDifficulty(step, difficulties[step.id]));
}

export function stretchDurationSeconds(holdSeconds: number) {
	return stretchSteps(holdSeconds).reduce(
		(total, step) => total + (step.durationSeconds ?? 0) * step.sets,
		0
	);
}

export function isStretchScheduled(date: string) {
	const day = new Date(`${date}T00:00:00.000Z`).getUTCDay();
	return day >= 1 && day <= 5;
}

export function formatStretchDuration(totalSeconds: number) {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return seconds ? `${minutes}:${String(seconds).padStart(2, '0')}` : `${minutes} min`;
}

function stretch(
	id: StretchActivityId,
	name: string,
	position: string,
	cue: string,
	durationSeconds: number | null,
	sets = STRETCH_SETS_PER_DAY
): Omit<StretchStep, 'imageUrl' | 'imageVariants' | 'selectedImageVariantId'> {
	return { id, name, position, cue, durationSeconds, sets };
}

function withDifficulty(
	step: Omit<StretchStep, 'imageUrl' | 'imageVariants' | 'selectedImageVariantId'>,
	difficulty: StretchDifficulty
): StretchStep {
	return {
		...step,
		imageUrl: stretchImageUrl(step.id, difficulty),
		imageVariants: STRETCH_DIFFICULTIES.map((id) => ({
			id,
			label: difficultyLabel(id),
			imageUrl: stretchImageUrl(step.id, id)
		})),
		selectedImageVariantId: difficulty
	};
}

function stretchImageUrl(id: StretchActivityId, difficulty: StretchDifficulty) {
	if (difficulty === 'medium') return `/stretch/activities/${id}.webp`;
	return `/stretch/activities/${id}-${difficulty}.png`;
}

function difficultyLabel(difficulty: StretchDifficulty) {
	return difficulty[0].toUpperCase() + difficulty.slice(1);
}
