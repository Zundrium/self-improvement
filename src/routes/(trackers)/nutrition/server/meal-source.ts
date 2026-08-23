import { parseMealImageDataUrl, type MealImage } from './meal-image';

export const MAX_MEAL_DESCRIPTION_LENGTH = 1000;

export type MealSource = {
	image: MealImage | null;
	description: string;
};

export function parseMealSource(imageValue: unknown, descriptionValue: unknown): MealSource {
	const image = parseOptionalImage(imageValue);
	const description = parseDescription(descriptionValue);
	if (!image && description.length < 2) {
		throw new Error('Add a meal photo or describe what you ate.');
	}
	return { image, description };
}

function parseOptionalImage(value: unknown) {
	if (value === undefined || value === null || value === '') return null;
	return parseMealImageDataUrl(value);
}

function parseDescription(value: unknown) {
	if (value === undefined || value === null || value === '') return '';
	if (typeof value !== 'string') throw new Error('The meal description must be text.');
	const description = value.trim();
	if (description.length > MAX_MEAL_DESCRIPTION_LENGTH) {
		throw new Error(`Keep the meal description under ${MAX_MEAL_DESCRIPTION_LENGTH} characters.`);
	}
	return description;
}
