import { z } from 'zod';

const instantSchema = z.iso.datetime();
const metadataSchema = z
	.object({ data_origin: z.string().trim().max(255).optional() })
	.passthrough();
const stepSchema = z.object({
	count: z.number().int().min(0).max(1_000_000),
	start_time: instantSchema,
	end_time: instantSchema,
	metadata: metadataSchema.optional()
});
const payloadSchema = z
	.object({
		timestamp: instantSchema,
		app_version: z.string().trim().min(1).max(40),
		steps: z.array(stepSchema).max(400).optional().default([])
	})
	.passthrough();

export type HealthConnectPayload = z.infer<typeof payloadSchema>;
export type HealthConnectStep = HealthConnectPayload['steps'][number];
export function parseHealthConnectPayload(input: unknown) {
	const payload = payloadSchema.parse(input);
	if (payload.steps.some((step) => Date.parse(step.end_time) < Date.parse(step.start_time)))
		throw new Error('A step interval ends before it starts.');
	return payload;
}
