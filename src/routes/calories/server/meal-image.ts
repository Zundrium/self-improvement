const MAX_IMAGE_DATA_URL_LENGTH = 768 * 1024;

export type MealImage = {
	mimeType: string;
	base64: string;
	dataUrl: string;
};

export function parseMealImageDataUrl(value: unknown): MealImage {
	if (typeof value !== 'string') throw new Error('A meal photo is required.');
	if (value.length > MAX_IMAGE_DATA_URL_LENGTH) throw new Error('The meal photo is too large.');
	const match = value.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/);
	if (!match) throw new Error('Use a JPG, PNG, or WebP image.');
	const mimeType = match[1] === 'image/jpg' ? 'image/jpeg' : match[1];
	const base64 = match[2].replace(/\s/g, '');
	if (!base64) throw new Error('The meal photo is empty.');
	return { mimeType, base64, dataUrl: `data:${mimeType};base64,${base64}` };
}
