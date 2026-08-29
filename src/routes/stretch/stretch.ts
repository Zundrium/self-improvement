export const STRETCH_VIDEO_URL = 'https://www.youtube.com/watch?v=QaKuVOhikaY';
export const STRETCH_SETS_PER_DAY = 2;
export const STRETCH_REST_SECONDS = 10;
export const WALL_ANGEL_REPS = 10;

export type StretchStep = {
	id: string;
	name: string;
	position: string;
	cue: string;
	imageUrl: string;
	durationSeconds: number | null;
	sets: number;
};

export type StretchCompletion = {
	localDate: string;
	holdSeconds: number;
};

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function stretchSteps(holdSeconds: number): StretchStep[] {
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
		{
			id: 'wall-angels',
			name: 'Wall angels',
			position: `${WALL_ANGEL_REPS} slow reps`,
			cue: 'Keep your ribs and back against the wall while your elbows and wrists move toward it.',
			imageUrl: '/stretch/activities/wall-angels.webp',
			durationSeconds: null,
			sets: 1
		}
	];
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
	id: string,
	name: string,
	position: string,
	cue: string,
	durationSeconds: number
): StretchStep {
	return {
		id,
		name,
		position,
		cue,
		imageUrl: `/stretch/activities/${id}.webp`,
		durationSeconds,
		sets: STRETCH_SETS_PER_DAY
	};
}
