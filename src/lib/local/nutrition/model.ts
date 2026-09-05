export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
const activityMultipliers: Record<ActivityLevel, number> = {
	sedentary: 1.2,
	light: 1.375,
	moderate: 1.55,
	active: 1.725,
	very_active: 1.9
};
export function calculateTdee(
	weightKg: number,
	heightCm: number,
	age: number,
	gender: 'male' | 'female',
	activity: ActivityLevel
) {
	const adjustment = gender === 'male' ? 5 : -161;
	const bmr = Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + adjustment);
	return Math.round(bmr * activityMultipliers[activity]);
}
