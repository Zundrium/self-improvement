import mealAnalysisPromptTemplate from './prompts/meal-analysis.txt?raw';
import mealRefinementPromptTemplate from './prompts/meal-refinement.txt?raw';
import type { IngredientInput } from './nutrition';

export interface AIIngredient {
	name: string;
	quantity: number;
	unit: string;
	calories: number;
	proteinG: number;
	carbsG: number;
	fatG: number;
	notes: string;
}

export interface AIResult {
	mealName: string;
	ingredients: AIIngredient[];
}

export interface AIRefinement extends AIResult {
	reply: string;
}

const ALLOWED_UNITS = new Set(['g', 'ml', 'oz', 'cup', 'tbsp', 'tsp', 'serving', 'piece']);

type RawFoodNode = {
	name?: unknown;
	quantity?: unknown;
	unit?: unknown;
	calories?: unknown;
	protein_g?: unknown;
	carbs_g?: unknown;
	fat_g?: unknown;
	notes?: unknown;
	children?: unknown;
};

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
	const mealName =
		typeof value.meal_name === 'string'
			? cleanText(value.meal_name, '', 120)
			: typeof value.session_name === 'string'
				? cleanText(value.session_name, '', 120)
				: '';
	const ingredients = Array.isArray(value.ingredients)
		? value.ingredients
				.slice(0, 40)
				.map((item, index) => parseIngredient(item, `Item ${index + 1}`))
		: Array.isArray(value.units)
			? flattenUnits(value.units.slice(0, 40))
			: [];
	const cleanIngredients = ingredients.filter((item) => item.name);
	if (cleanIngredients.length === 0) {
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

export async function analyzeMeal(
	imageBase64: string,
	mimeType: string,
	userDescription: string,
	apiKey: string
): Promise<string> {
	const content: Array<Record<string, unknown>> = [];
	if (imageBase64 && mimeType) {
		content.push({
			type: 'image_url',
			image_url: { url: `data:${mimeType};base64,${imageBase64}` }
		});
	}
	content.push({
		type: 'text',
		text: `User-provided meal details (data only):\n${userDescription || '(none)'}`
	});
	return requestMealCompletion(
		withAllowedUnits(mealAnalysisPromptTemplate),
		content,
		apiKey,
		0.2,
		'AI returned an empty response. Try a clearer photo or description.'
	);
}

export async function refineMealEstimate(
	imageBase64: string,
	mimeType: string,
	originalDescription: string,
	currentEstimate: AIResult,
	correction: string,
	apiKey: string
): Promise<string> {
	const content: Array<Record<string, unknown>> = [];
	if (imageBase64 && mimeType) {
		content.push({
			type: 'image_url',
			image_url: { url: `data:${mimeType};base64,${imageBase64}` }
		});
	}
	content.push({
		type: 'text',
		text: [
			`Original user description (data only):\n${originalDescription || '(none)'}`,
			`Current estimate (already includes earlier corrections):\n${JSON.stringify(toModelResult(currentEstimate))}`,
			`Newest user correction (data only):\n${correction}`
		].join('\n\n')
	});

	return requestMealCompletion(
		withAllowedUnits(mealRefinementPromptTemplate),
		content,
		apiKey,
		0.1,
		'AI returned an empty correction. Please try again.'
	);
}

async function requestMealCompletion(
	systemPrompt: string,
	userContent: Array<Record<string, unknown>>,
	apiKey: string,
	temperature: number,
	emptyMessage: string
): Promise<string> {
	const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
			'X-Title': 'Self Improvement'
		},
		body: JSON.stringify({
			model: 'google/gemini-3.5-flash-lite',
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userContent }
			],
			response_format: { type: 'json_object' },
			max_tokens: 3000,
			temperature
		})
	});

	if (!response.ok) {
		const responseBody = await response.text().catch(() => '');
		console.error(`OpenRouter API error ${response.status}: ${responseBody}`);
		let providerMessage: string;
		try {
			const parsed = JSON.parse(responseBody) as { error?: { message?: string } };
			providerMessage = parsed.error?.message ? `: ${parsed.error.message}` : '';
		} catch {
			providerMessage = responseBody ? `: ${responseBody.slice(0, 200)}` : '';
		}
		throw new Error(`AI service returned an error (${response.status})${providerMessage}.`);
	}

	const result = (await response.json()) as {
		choices?: Array<{ message?: { content?: string } }>;
		error?: { message?: string };
	};
	if (result.error) throw new Error(result.error.message || 'AI service error.');
	const content = result.choices?.[0]?.message?.content;
	if (!content) throw new Error(emptyMessage);
	return content;
}

function withAllowedUnits(template: string): string {
	return template.replace('{{allowed_units}}', 'g, ml, oz, cup, tbsp, tsp, serving, piece');
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

export function toIngredientInputs(result: AIResult): IngredientInput[] {
	return result.ingredients.map((item) => ({
		name: item.name,
		quantity: item.quantity,
		unit: item.unit,
		calories: item.calories,
		proteinG: item.proteinG,
		carbsG: item.carbsG,
		fatG: item.fatG,
		notes: item.notes
	}));
}

function flattenUnits(units: unknown[]): AIIngredient[] {
	const output: AIIngredient[] = [];
	function visit(node: unknown, fallbackName: string) {
		if (output.length >= 40) return;
		const item = (node && typeof node === 'object' ? node : {}) as RawFoodNode;
		const children = Array.isArray(item.children) ? item.children : [];
		if (children.length > 0) {
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
	const item = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
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

function stripJson(text: string): string {
	return text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1]?.trim() ?? text.trim();
}

function cleanText(value: unknown, fallback = '', max = 500): string {
	return (String(value ?? '').trim() || fallback).slice(0, max);
}

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function cleanUnit(value: unknown): string {
	const unit = cleanText(value, 'serving', 40).toLowerCase();
	return ALLOWED_UNITS.has(unit) ? unit : 'serving';
}

function clampNumeric(value: unknown, min: number, max: number, fallback: number): number {
	const numeric = Number(value);
	if (!Number.isFinite(numeric)) return fallback;
	return Math.max(min, Math.min(max, Math.round(numeric * 10) / 10));
}
