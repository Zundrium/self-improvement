export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type EatingWindowSchedule = { start: string; end: string };

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
	sedentary: 1.2,
	light: 1.375,
	moderate: 1.55,
	active: 1.725,
	very_active: 1.9
};

export function calculateBmr(
	weightKg: number,
	heightCm: number,
	age: number,
	gender: 'male' | 'female'
) {
	const genderAdjustment = gender === 'male' ? 5 : -161;
	return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + genderAdjustment);
}

export function calculateTdee(
	weightKg: number,
	heightCm: number,
	age: number,
	gender: 'male' | 'female',
	activity: ActivityLevel
) {
	return Math.round(calculateBmr(weightKg, heightCm, age, gender) * ACTIVITY_MULTIPLIERS[activity]);
}

export function isEatingWindowOpen(schedule: EatingWindowSchedule, currentMinute: number) {
	return (
		currentMinute >= minutesFromTime(schedule.start) &&
		currentMinute < minutesFromTime(schedule.end)
	);
}

function minutesFromTime(time: string) {
	const [hour, minute] = time.split(':').map(Number);
	return hour * 60 + minute;
}
