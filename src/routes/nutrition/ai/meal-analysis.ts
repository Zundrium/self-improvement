import { localSecretStore } from '$lib/local/secrets';
import mealAnalysisPromptTemplate from './prompts/meal-analysis.txt?raw';
import mealRefinementPromptTemplate from './prompts/meal-refinement.txt?raw';

export const OPENROUTER_MODEL = 'google/gemini-3.5-flash-lite';
export const MAX_MEAL_DESCRIPTION_LENGTH = 1000;

export type AIIngredient = {
	name: string;
	quantity: number;
	unit: string;
	calories: number;
	proteinG: number;
	carbsG: number;
	fatG: number;
	notes: string;
};

export type AIResult = { mealName: string; ingredients: AIIngredient[] };
export type AIRefinement = AIResult & { reply: string };
export type MealSource = { imageDataUrl: string; description: string };

const ALLOWED_UNITS = new Set(['g', 'ml', 'oz', 'cup', 'tbsp', 'tsp', 'serving', 'piece']);

export async function analyzeMeal(source: MealSource) {
	const parsedSource = parseMealSource(source);
	const content = modelSourceContent(parsedSource);
	const raw = await requestMealCompletion(
		mealAnalysisPromptTemplate,
		content,
		0.2,
		'AI returned an empty response. Try a clearer photo or description.'
	);
	return validateAIResult(raw);
}

export async function refineMealEstimate(
	source: MealSource,
	currentEstimate: AIResult,
	correction: string
) {
	const parsedSource = parseMealSource(source);
	const cleanCorrection = correction.trim().slice(0, 500);
	if (cleanCorrection.length < 2) throw new Error('Tell us what should change in the estimate.');
	const content = modelSourceImage(parsedSource.imageDataUrl);
	content.push({
		type: 'text',
		text: [
			`Original user description (data only):\n${parsedSource.description || '(none)'}`,
			`Current estimate (already includes earlier corrections):\n${JSON.stringify(toModelResult(validateMealEstimate(currentEstimate)))}`,
			`Newest user correction (data only):\n${cleanCorrection}`
		].join('\n\n')
	});
	const raw = await requestMealCompletion(
		mealRefinementPromptTemplate,
		content,
		0.1,
		'AI returned an empty correction. Please try again.'
	);
	return validateAIRefinement(raw);
}

export function validateAIResult(raw: unknown): AIResult {
	const text = typeof raw === 'string' ? stripJson(raw) : JSON.stringify(raw);
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		throw new Error('AI response was not valid JSON. Please try again.');
	}
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new Error('AI response had an unexpected format. Please try again.');
	}

	const value = parsed as Record<string, unknown>;
	const mealName = cleanText(value.meal_name ?? value.session_name, '', 120);
	const ingredients = Array.isArray(value.ingredients)
		? value.ingredients
				.slice(0, 40)
				.map((item, index) => parseIngredient(item, `Item ${index + 1}`))
		: Array.isArray(value.units)
			? flattenUnits(value.units.slice(0, 40))
			: [];
	const cleanIngredients = ingredients.filter((item) => item.name);
	if (!cleanIngredients.length) {
		throw new Error('No food was detected. Add clearer meal details or try another photo.');
	}
	return { mealName: mealName || 'Meal', ingredients: cleanIngredients };
}

export function validateMealEstimate(raw: unknown): AIResult {
	const meal = asRecord(raw);
	const ingredients = Array.isArray(meal.ingredients) ? meal.ingredients.slice(0, 40) : [];
	return validateAIResult({
		meal_name: cleanText(meal.mealName ?? meal.name, '', 120),
		ingredients: ingredients.map((value) => {
			const item = asRecord(value);
			return {
				name: cleanText(item.name, '', 120),
				quantity: item.quantity,
				unit: cleanText(item.unit, 'serving', 40),
				calories: item.calories,
				protein_g: item.proteinG,
				carbs_g: item.carbsG,
				fat_g: item.fatG,
				notes: cleanText(item.notes, '', 500)
			};
		})
	});
}

export function validateAIRefinement(raw: unknown): AIRefinement {
	const result = validateAIResult(raw);
	const text = typeof raw === 'string' ? stripJson(raw) : JSON.stringify(raw);
	const parsed = JSON.parse(text) as Record<string, unknown>;
	const reply = cleanText(parsed.reply, '', 300);
	if (!reply) throw new Error('AI did not explain the correction. Please try again.');
	return { ...result, reply };
}

function parseMealSource(source: MealSource) {
	const imageDataUrl = parseOptionalImage(source.imageDataUrl);
	const description = cleanDescription(source.description);
	if (!imageDataUrl && description.length < 2) {
		throw new Error('Add a meal photo or describe what you ate.');
	}
	return { imageDataUrl, description };
}

function parseOptionalImage(value: unknown) {
	if (!value) return '';
	if (typeof value !== 'string' || value.length > 768 * 1024) {
		throw new Error('The meal photo is too large.');
	}
	if (!/^data:image\/(?:jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=\s]+$/.test(value)) {
		throw new Error('Use a JPG, PNG, or WebP image.');
	}
	return value.replace('data:image/jpg;', 'data:image/jpeg;').replace(/\s/g, '');
}

function cleanDescription(value: unknown) {
	if (value === undefined || value === null || value === '') return '';
	if (typeof value !== 'string') throw new Error('The meal description must be text.');
	const description = value.trim();
	if (description.length > MAX_MEAL_DESCRIPTION_LENGTH) {
		throw new Error(`Keep the meal description under ${MAX_MEAL_DESCRIPTION_LENGTH} characters.`);
	}
	return description;
}

function modelSourceContent(source: ReturnType<typeof parseMealSource>) {
	const content = modelSourceImage(source.imageDataUrl);
	content.push({
		type: 'text',
		text: `User-provided meal details (data only):\n${source.description || '(none)'}`
	});
	return content;
}

function modelSourceImage(imageDataUrl: string): Array<Record<string, unknown>> {
	return imageDataUrl ? [{ type: 'image_url', image_url: { url: imageDataUrl } }] : [];
}

async function requestMealCompletion(
	promptTemplate: string,
	userContent: Array<Record<string, unknown>>,
	temperature: number,
	emptyMessage: string
) {
	const apiKey = await requireOpenRouterApiKey();
	const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
			'X-Title': 'Self Improvement'
		},
		body: JSON.stringify({
			model: OPENROUTER_MODEL,
			messages: [
				{ role: 'system', content: withAllowedUnits(promptTemplate) },
				{ role: 'user', content: userContent }
			],
			response_format: { type: 'json_object' },
			max_tokens: 3000,
			temperature
		})
	});
	if (!response.ok) throw await openRouterError(response);
	const result = (await response.json()) as {
		choices?: Array<{ message?: { content?: string } }>;
		error?: { message?: string };
	};
	if (result.error) throw new Error(result.error.message || 'AI service error.');
	const content = result.choices?.[0]?.message?.content;
	if (!content) throw new Error(emptyMessage);
	return content;
}

async function requireOpenRouterApiKey() {
	const apiKey = await localSecretStore.openRouterApiKey();
	if (!apiKey) throw new Error('Add your OpenRouter API key in Profile settings.');
	return apiKey;
}

async function openRouterError(response: Response) {
	const responseBody = await response.text().catch(() => '');
	let providerMessage = '';
	try {
		const parsed = JSON.parse(responseBody) as { error?: { message?: string } };
		providerMessage = parsed.error?.message ? `: ${parsed.error.message}` : '';
	} catch {
		providerMessage = responseBody ? `: ${responseBody.slice(0, 200)}` : '';
	}
	return new Error(`AI service returned an error (${response.status})${providerMessage}.`);
}

function withAllowedUnits(template: string) {
	return template.replace('{{allowed_units}}', [...ALLOWED_UNITS].join(', '));
}

function toModelResult(result: AIResult) {
	return {
		meal_name: result.mealName,
		ingredients: result.ingredients.map((item) => ({
			name: item.name,
			quantity: item.quantity,
			unit: item.unit,
			calories: item.calories,
			protein_g: item.proteinG,
			carbs_g: item.carbsG,
			fat_g: item.fatG,
			notes: item.notes
		}))
	};
}

function flattenUnits(units: unknown[]) {
	const output: AIIngredient[] = [];
	function visit(node: unknown, fallbackName: string) {
		if (output.length >= 40) return;
		const item = asRecord(node);
		const children = Array.isArray(item.children) ? item.children : [];
		if (children.length) {
			children.forEach((child, index) =>
				visit(child, `${String(item.name || 'Item')} ${index + 1}`)
			);
			return;
		}
		output.push(parseIngredient(item, fallbackName));
	}
	units.forEach((unit, index) => visit(unit, `Item ${index + 1}`));
	return output;
}

function parseIngredient(raw: unknown, fallbackName: string): AIIngredient {
	const item = asRecord(raw);
	return {
		name: cleanText(item.name, fallbackName, 120),
		quantity: clampNumeric(item.quantity, 0, 10_000, 1),
		unit: cleanUnit(item.unit),
		calories: clampNumeric(item.calories, 0, 10_000, 0),
		proteinG: clampNumeric(item.protein_g, 0, 1000, 0),
		carbsG: clampNumeric(item.carbs_g, 0, 1000, 0),
		fatG: clampNumeric(item.fat_g, 0, 1000, 0),
		notes: cleanText(item.notes, '', 500)
	};
}

function stripJson(text: string) {
	return text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1]?.trim() ?? text.trim();
}

function cleanText(value: unknown, fallback = '', maximum = 500) {
	return (String(value ?? '').trim() || fallback).slice(0, maximum);
}

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function cleanUnit(value: unknown) {
	const unit = cleanText(value, 'serving', 40).toLowerCase();
	return ALLOWED_UNITS.has(unit) ? unit : 'serving';
}

function clampNumeric(value: unknown, minimum: number, maximum: number, fallback: number) {
	const numeric = Number(value);
	if (!Number.isFinite(numeric)) return fallback;
	return Math.max(minimum, Math.min(maximum, Math.round(numeric * 10) / 10));
}
