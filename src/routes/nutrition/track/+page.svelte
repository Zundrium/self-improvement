<script lang="ts">
import {
	ArrowLeft,
	Camera,
	Check,
	Droplet,
	Drumstick,
	FileText,
	Flame,
	ImagePlus,
	RefreshCw,
	Send,
	SwitchCamera,
	Wheat,
	X
} from '@lucide/svelte';
import { onDestroy, onMount, tick } from 'svelte';
import { SvelteSet } from 'svelte/reactivity';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { apiRequest } from '$lib/api';
import BottomActionBar from '$lib/components/bottomActionBar.svelte';
import { Alert, AlertDescription } from '$lib/components/ui/alert';
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '$lib/components/ui/field';
import { Input } from '$lib/components/ui/input';
import { Spinner } from '$lib/components/ui/spinner';
import { Textarea } from '$lib/components/ui/textarea';
import { toast } from '$lib/components/ui/toast';
import WorkflowHeader from '$lib/components/workflowHeader.svelte';
import { localSecretStore } from '$lib/local/secrets';
import {
	type AIResult,
	MAX_MEAL_DESCRIPTION_LENGTH,
	refineMealEstimate,
	analyzeMeal as requestMealAnalysis
} from '../ai/meal-analysis';
import type { PageProps } from './$types';

let { data }: PageProps = $props();

type Phase =
	| 'checking'
	| 'setup'
	| 'photo'
	| 'description'
	| 'analyzing'
	| 'analysis-error'
	| 'review'
	| 'correction'
	| 'refining'
	| 'saving';
type CameraState = 'opening' | 'ready' | 'error';
type MealEstimate = AIResult;

const MAX_IMAGE_LENGTH = 740 * 1024;
const MAX_DESCRIPTION_LENGTH = MAX_MEAL_DESCRIPTION_LENGTH;
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
let phase = $state<Phase>('checking');
let cameraState = $state<CameraState>('opening');
let cameraError = $state('');
let facingMode = $state<'environment' | 'user'>('environment');
let video = $state<HTMLVideoElement | null>(null);
let fileInput = $state<HTMLInputElement | null>(null);
let descriptionInput = $state<HTMLTextAreaElement | null>(null);
let correctionInput = $state<HTMLTextAreaElement | null>(null);
let selectedImage = $state('');
let mealDescription = $state('');
let estimate = $state<MealEstimate | null>(null);
let correction = $state('');
let requestError = $state('');
let processingPhoto = $state(false);
let stream: MediaStream | null = null;

const totals = $derived.by(() => {
	if (!estimate) return { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
	return estimate.ingredients.reduce(
		(total, item) => ({
			calories: total.calories + item.calories,
			proteinG: total.proteinG + item.proteinG,
			carbsG: total.carbsG + item.carbsG,
			fatG: total.fatG + item.fatG
		}),
		{ calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
	);
});
function api<T>(path: string, init?: RequestInit) {
	return apiRequest<T>(path, init);
}

async function startCamera() {
	if (phase !== 'photo') return;
	cameraState = 'opening';
	cameraError = '';
	stopCamera();
	try {
		if (!globalThis.isSecureContext) throw new Error('Camera access requires a secure connection.');
		if (!navigator.mediaDevices?.getUserMedia)
			throw new Error('This browser cannot open the camera.');
		const nextStream = await navigator.mediaDevices.getUserMedia({
			video: {
				facingMode: { ideal: facingMode },
				width: { ideal: 1080 },
				height: { ideal: 1920 },
				aspectRatio: { ideal: 9 / 16 },
				frameRate: { ideal: 30 }
			},
			audio: false
		});
		if (phase !== 'photo') {
			nextStream.getTracks().forEach((track) => track.stop());
			return;
		}
		stream = nextStream;
		await tick();
		if (!video) throw new Error('The camera preview is unavailable.');
		video.srcObject = stream;
		await video.play();
		cameraState = 'ready';
	} catch (cause) {
		stopCamera();
		cameraState = 'error';
		cameraError = cause instanceof Error ? cause.message : 'Could not open the camera.';
	}
}

async function switchCamera() {
	facingMode = facingMode === 'environment' ? 'user' : 'environment';
	await startCamera();
}

async function takePhoto() {
	if (cameraState !== 'ready' || processingPhoto) return;
	try {
		const photo = encodeImage(video, video?.videoWidth ?? 0, video?.videoHeight ?? 0);
		await acceptPhoto(photo);
	} catch (cause) {
		toast.error('Could not capture the photo', {
			description: cause instanceof Error ? cause.message : 'Try again or choose a photo.'
		});
	}
}

async function choosePhoto(event: Event) {
	const input = event.currentTarget as HTMLInputElement;
	const file = input.files?.[0];
	input.value = '';
	if (!file) return;
	if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
		toast.error('Use a JPG, PNG, or WebP photo.');
		return;
	}
	if (file.size > 12 * 1024 * 1024) {
		toast.error('That photo is too large', {
			description: 'Choose an image smaller than 12 MB.'
		});
		return;
	}

	processingPhoto = true;
	try {
		const photo = await compressFile(file);
		await acceptPhoto(photo);
	} catch (cause) {
		toast.error('Could not use that photo', {
			description: cause instanceof Error ? cause.message : 'Choose a different photo.'
		});
	} finally {
		processingPhoto = false;
	}
}

async function acceptPhoto(photo: string) {
	if (!photo) throw new Error('The photo was empty.');
	selectedImage = photo;
	mealDescription = '';
	resetEstimate();
	stopCamera();
	await analyzeMeal();
}

async function openDescription() {
	stopCamera();
	selectedImage = '';
	resetEstimate();
	phase = 'description';
	await tick();
	descriptionInput?.focus();
}

async function submitDescription(event: SubmitEvent) {
	event.preventDefault();
	mealDescription = mealDescription.trim();
	if (mealDescription.length < 2) return;
	await analyzeMeal();
}

async function analyzeMeal() {
	if (!selectedImage && mealDescription.length < 2) return;
	requestError = '';
	phase = 'analyzing';
	try {
		estimate = await requestMealAnalysis(mealSource());
		phase = 'review';
	} catch (cause) {
		requestError =
			cause instanceof Error ? cause.message : 'Could not analyze this meal. Try again.';
		phase = 'analysis-error';
	}
}

async function retakePhoto() {
	selectedImage = '';
	mealDescription = '';
	resetEstimate();
	phase = 'photo';
	await tick();
	await startCamera();
}

async function editMealSource() {
	if (selectedImage) await retakePhoto();
	else await openDescription();
}

function resetEstimate() {
	estimate = null;
	correction = '';
	requestError = '';
}

function mealSource() {
	return { imageDataUrl: selectedImage, description: mealDescription };
}

async function openCorrection() {
	requestError = '';
	correction = '';
	phase = 'correction';
	await tick();
	correctionInput?.focus();
}

async function submitCorrection(event: SubmitEvent) {
	event.preventDefault();
	const cleanCorrection = correction.trim();
	if (!estimate || cleanCorrection.length < 2 || phase !== 'correction') return;
	requestError = '';
	phase = 'refining';
	try {
		estimate = await refineMealEstimate(mealSource(), estimate, cleanCorrection);
		correction = '';
		phase = 'review';
	} catch (cause) {
		requestError =
			cause instanceof Error ? cause.message : 'Could not update the estimate. Try again.';
		phase = 'correction';
		await tick();
		correctionInput?.focus();
	}
}

async function confirmMeal() {
	if (!estimate || phase !== 'review') return;
	requestError = '';
	phase = 'saving';
	try {
		const time = inputTime(new Date());
		await api('/api/app/nutrition/entries', {
			method: 'POST',
			body: JSON.stringify({
				date: data.date,
				time,
				timeZoneOffset: new Date(`${data.date}T${time}:00`).getTimezoneOffset(),
				name: estimate.mealName,
				notes: '',
				meals: [
					{
						name: estimate.mealName,
						imageDataUrl: selectedImage,
						ingredients: estimate.ingredients
					}
				]
			})
		});
		toast.success('Meal added to your log');
		await goto(resolve('/nutrition/log/[date]', { date: data.date }));
	} catch (cause) {
		requestError = cause instanceof Error ? cause.message : 'Could not add this meal. Try again.';
		phase = 'review';
	}
}

async function compressFile(file: File) {
	if (typeof globalThis.createImageBitmap === 'function') {
		const bitmap = await createImageBitmap(file);
		try {
			return encodeImage(bitmap, bitmap.width, bitmap.height);
		} finally {
			bitmap.close();
		}
	}

	const objectUrl = URL.createObjectURL(file);
	try {
		const image = document.createElement('img');
		image.src = objectUrl;
		await image.decode();
		return encodeImage(image, image.naturalWidth, image.naturalHeight);
	} finally {
		URL.revokeObjectURL(objectUrl);
	}
}

function encodeImage(source: CanvasImageSource | null, sourceWidth: number, sourceHeight: number) {
	if (!source || !sourceWidth || !sourceHeight)
		throw new Error('Wait for the camera to focus, then try again.');
	const triedWidths = new SvelteSet<number>();
	for (const targetWidth of [1200, 1000, 840, 720, 640]) {
		const width = Math.min(targetWidth, sourceWidth);
		if (triedWidths.has(width)) continue;
		triedWidths.add(width);
		for (const quality of [0.82, 0.72, 0.62, 0.52]) {
			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = Math.round((sourceHeight * width) / sourceWidth);
			const context = canvas.getContext('2d');
			if (!context) throw new Error('This browser cannot prepare the photo.');
			context.drawImage(source, 0, 0, canvas.width, canvas.height);
			const result = canvas.toDataURL('image/jpeg', quality);
			if (result.length <= MAX_IMAGE_LENGTH) return result;
		}
	}
	throw new Error('The photo could not be reduced to a safe upload size.');
}

function stopCamera() {
	stream?.getTracks().forEach((track) => track.stop());
	stream = null;
	if (video) video.srcObject = null;
}

function inputTime(value: Date) {
	return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

async function initialize() {
	if (!(await localSecretStore.openRouterApiKey())) {
		phase = 'setup';
		return;
	}
	phase = 'photo';
	await tick();
	await startCamera();
}

onMount(() => void initialize());
onDestroy(stopCamera);
</script>

<svelte:head><title>Add a meal · Self Improvement</title></svelte:head>

<Input
	bind:ref={fileInput}
	type="file"
	accept="image/jpeg,image/png,image/webp"
	class="sr-only"
	onchange={choosePhoto}
/>

<main class="flex h-full min-h-0 flex-col overflow-hidden bg-(--bg)">
	{#if phase === 'checking'}
		<section class="flex min-h-0 flex-1 items-center justify-center" aria-label="Loading nutrition tracker">
			<Spinner class="size-8" />
		</section>
	{:else if phase === 'setup'}
		<WorkflowHeader title="Connect OpenRouter">
			{#snippet leading()}
				<Button
					href="/nutrition/log/{data.date}"
					variant="ghost"
					size="icon"
					aria-label="Back to food log"><X class="size-5" /></Button
				>
			{/snippet}
		</WorkflowHeader>
		<section class="app-gutter mx-auto flex min-h-0 w-full max-w-lg flex-1 items-center py-8">
			<div class="w-full space-y-5 text-center">
				<span class="mx-auto flex size-14 items-center justify-center rounded-full bg-(--text)/5">
					<Camera class="size-6" />
				</span>
				<div>
					<h1 class="text-3xl font-medium tracking-[-0.055em]">Set up AI nutrition</h1>
					<p class="mt-2 text-sm leading-6 text-(--text)/56">
						Add your OpenRouter API key before analyzing a meal.
					</p>
				</div>
				<Button href="/profile?tab=general" size="lg" class="w-full">Open profile settings</Button>
			</div>
		</section>
	{:else if phase === 'photo'}
		<section class="relative min-h-0 flex-1 overflow-hidden bg-black text-white">
			<video
				bind:this={video}
				autoplay
				playsinline
				muted
				class="absolute inset-0 size-full object-cover {facingMode === 'user'
					? '-scale-x-100'
					: ''}"
			></video>
			<div
				class="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/65"
			></div>
			<div class="app-gutter absolute inset-x-0 top-4 z-30">
				<div
					class="mx-auto flex w-fit max-w-full items-center gap-3 rounded-3xl bg-(--bg-elevated)/92 px-4 py-2 text-(--text) backdrop-blur-md"
				>
					<Badge class="bg-(--tracker-fade-color) text-white">1 / 3</Badge>
					<p class="truncate text-sm font-medium">Take a photo of your meal</p>
				</div>
			</div>

			{#if cameraState !== 'ready'}
				<div class="absolute inset-0 flex items-center justify-center bg-black px-6 text-center">
					<div class="max-w-xs space-y-4">
						{#if cameraState === 'error'}
							<span class="mx-auto flex size-14 items-center justify-center rounded-full bg-white/10"
								><Camera class="size-6" /></span
							>
							<div>
								<p class="font-medium">Camera unavailable</p>
								<p class="mt-1 text-sm text-white/60">{cameraError}</p>
							</div>
							<div class="flex justify-center gap-2">
								<Button class="bg-white text-black hover:bg-white/90" onclick={startCamera}
									><RefreshCw class="mr-1.5 size-4" /> Retry</Button
								>
								<Button
									class="bg-white/12 text-white hover:bg-white/20"
									onclick={() => fileInput?.click()}
									><ImagePlus class="mr-1.5 size-4" /> Choose photo</Button
								>
							</div>
						{:else}
							<Spinner class="mx-auto size-10 text-white" />
							<p class="text-sm text-white/60">Opening camera…</p>
						{/if}
					</div>
				</div>
			{/if}

			{#if processingPhoto}
				<div class="absolute inset-0 z-20 flex items-center justify-center bg-black/55 text-white">
					<Spinner class="size-12" />
				</div>
			{/if}
		</section>
	{:else if phase === 'description'}
		<WorkflowHeader title="Describe your meal">
			{#snippet leading()}<Badge class="bg-(--tracker-fade-color) text-white">1 / 3</Badge>{/snippet}
		</WorkflowHeader>

		<section class="app-gutter mx-auto min-h-0 w-full max-w-xl flex-1 overflow-y-auto py-8 sm:py-12">
			<div class="flex min-h-full items-center">
				<div class="w-full space-y-6">
					<div>
						<Badge><FileText class="size-3.5" /> No photo needed</Badge>
						<h1 class="mt-4 text-3xl font-medium tracking-[-0.055em] sm:text-4xl">
							Describe what you ate
						</h1>
						<p class="mt-2 text-sm leading-6 text-(--text)/56">
							Include portions, ingredients, drinks, sauces, and cooking fats when you know them.
						</p>
					</div>

					<form class="space-y-5" onsubmit={submitDescription}>
						<Field>
							<div class="flex items-end justify-between gap-3">
								<FieldLabel for="meal-description">Meal description</FieldLabel>
								<span class="text-xs text-(--text)/40 tabular-nums">
									{mealDescription.length}/{MAX_DESCRIPTION_LENGTH}
								</span>
							</div>
							<Textarea
								bind:ref={descriptionInput}
								id="meal-description"
								bind:value={mealDescription}
								maxlength={MAX_DESCRIPTION_LENGTH}
								rows={8}
								class="min-h-48 text-base leading-6"
								placeholder="e.g. Two scrambled eggs cooked in butter, two slices of sourdough toast, and a small latte"
							/>
							<FieldDescription>One meal per estimate. You can correct the result next.</FieldDescription>
						</Field>
						<Button
							type="submit"
							size="lg"
							class="w-full"
							disabled={mealDescription.trim().length < 2}
						>
							Estimate nutrition <Send class="ml-2 size-4" />
						</Button>
					</form>
				</div>
			</div>
		</section>
	{:else if phase === 'analyzing' || phase === 'refining'}
		<section
			class="relative min-h-0 flex-1 overflow-hidden {selectedImage ? 'bg-black' : 'bg-(--bg-elevated)'}"
			aria-live="polite"
			aria-label={phase === 'analyzing' ? 'Analyzing meal' : 'Updating estimate'}
		>
			{#if selectedImage}
				<img src={selectedImage} alt="" class="absolute inset-0 size-full object-cover" />
			{:else}
				<div class="app-gutter flex size-full items-center justify-center">
					<p class="max-w-lg text-center text-sm leading-6 text-(--text)/64">{mealDescription}</p>
				</div>
			{/if}
			<div
				class="absolute inset-0 flex items-center justify-center {selectedImage
					? 'bg-black/55 text-white'
					: 'bg-(--bg)/70 text-(--text)'}"
			>
				<Spinner class="size-12" />
			</div>
			<div class="app-gutter absolute inset-x-0 top-4 z-30">
				<div
					class="mx-auto flex w-fit max-w-full items-center gap-3 rounded-3xl bg-(--bg-elevated)/92 px-4 py-2 text-(--text) backdrop-blur-md"
				>
					<Badge class="bg-(--tracker-fade-color) text-white">
						{phase === 'analyzing' ? '2 / 3' : '3 / 3'}
					</Badge>
					<p class="truncate text-sm font-medium">
						{phase === 'analyzing' ? 'Analyzing meal' : 'Updating estimate'}
					</p>
				</div>
			</div>
		</section>
	{:else if phase === 'analysis-error'}
		<section class="relative min-h-0 flex-1 overflow-hidden {selectedImage ? 'bg-black' : ''}">
			{#if selectedImage}
				<img src={selectedImage} alt="Your meal" class="absolute inset-0 size-full object-cover" />
				<div class="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-black/60"></div>
			{/if}
			<div class="app-gutter absolute inset-x-0 top-4 z-30">
				<div
					class="mx-auto flex w-fit max-w-full items-center gap-3 rounded-3xl bg-(--bg-elevated)/92 px-4 py-2 backdrop-blur-md"
				>
					<Badge class="bg-(--tracker-fade-color) text-white">2 / 3</Badge>
					<p class="truncate text-sm font-medium">Could not analyze meal</p>
				</div>
			</div>
			<div class="app-gutter relative z-10 flex size-full items-end py-4">
				<div class="mx-auto w-full max-w-lg space-y-3 rounded-3xl bg-(--bg-elevated)/92 p-4 backdrop-blur-md">
					{#if !selectedImage}
						<p class="line-clamp-4 text-sm leading-6 text-(--text)/64">{mealDescription}</p>
					{/if}
					<Alert variant="destructive"><AlertDescription>{requestError}</AlertDescription></Alert>
				</div>
			</div>
		</section>
	{:else if estimate}
		<section class="relative min-h-0 flex-1 overflow-y-auto {selectedImage ? 'bg-black' : ''}">
			{#if selectedImage}
				<img
					src={selectedImage}
					alt={estimate.mealName}
					class="absolute inset-0 size-full object-cover"
				/>
				<div class="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-black/55"></div>
			{:else}
				<div class="app-gutter absolute inset-0 flex items-center justify-center bg-(--bg-elevated)">
					<p class="max-w-lg text-center text-sm leading-6 text-(--text)/64">{mealDescription}</p>
				</div>
			{/if}
			<div class="app-gutter absolute inset-x-0 top-4 z-30">
				<div
					class="mx-auto flex w-fit max-w-full items-center gap-3 rounded-3xl bg-(--bg-elevated)/92 px-4 py-2 backdrop-blur-md"
				>
					<Badge class="bg-(--tracker-fade-color) text-white">3 / 3</Badge>
					<p class="truncate text-sm font-medium">Review estimate</p>
				</div>
			</div>

			<div class="app-gutter relative z-10 flex min-h-full items-end py-4">
				<div class="mx-auto w-full max-w-xl space-y-4 rounded-3xl bg-(--bg-elevated)/92 p-4 backdrop-blur-md">
					<h1 class="text-xl font-medium tracking-[-0.04em] sm:text-2xl">{estimate.mealName}</h1>

					<div class="grid grid-cols-4 gap-2" aria-label="Estimated nutrition">
						<div class="flex min-w-0 flex-col items-center gap-1 text-center">
							<Flame class="size-5 text-chart-4" aria-hidden="true" />
							<strong class="text-sm tabular-nums">{Math.round(totals.calories)}</strong>
							<span class="text-[0.68rem] text-(--text)/48">kcal</span>
						</div>
						<div class="flex min-w-0 flex-col items-center gap-1 text-center">
							<Drumstick class="size-5 text-chart-2" aria-hidden="true" />
							<strong class="text-sm tabular-nums">{totals.proteinG.toFixed(1)}g</strong>
							<span class="text-[0.68rem] text-(--text)/48">protein</span>
						</div>
						<div class="flex min-w-0 flex-col items-center gap-1 text-center">
							<Wheat class="size-5 text-chart-1" aria-hidden="true" />
							<strong class="text-sm tabular-nums">{totals.carbsG.toFixed(1)}g</strong>
							<span class="text-[0.68rem] text-(--text)/48">carbs</span>
						</div>
						<div class="flex min-w-0 flex-col items-center gap-1 text-center">
							<Droplet class="size-5 text-chart-3" aria-hidden="true" />
							<strong class="text-sm tabular-nums">{totals.fatG.toFixed(1)}g</strong>
							<span class="text-[0.68rem] text-(--text)/48">fat</span>
						</div>
					</div>

					{#if requestError}
						<Alert variant="destructive"><AlertDescription>{requestError}</AlertDescription></Alert>
					{/if}

					{#if phase === 'correction'}
						<form class="space-y-3" onsubmit={submitCorrection}>
							<Field>
								<div class="flex items-end justify-between gap-3">
									<FieldLabel for="meal-correction">What should we correct?</FieldLabel>
									<span class="text-xs text-(--text)/40 tabular-nums">{correction.length}/500</span>
								</div>
								<Textarea
									bind:ref={correctionInput}
									id="meal-correction"
									bind:value={correction}
									maxlength={500}
									rows={3}
									class="min-h-20 text-base leading-6"
									placeholder="e.g. It was two eggs, and the bread had butter"
								/>
							</Field>
							<div class="grid grid-cols-[auto_1fr] gap-2">
								<Button
									type="button"
									variant="ghost"
									size="lg"
									class="px-5"
									onclick={() => {
										requestError = '';
										phase = 'review';
									}}
									aria-label="Back to estimate"><ArrowLeft class="size-5" /></Button
								>
								<Button type="submit" size="lg" disabled={correction.trim().length < 2}
									>Update estimate <Send class="ml-2 size-4" /></Button
								>
							</div>
						</form>
					{/if}
				</div>
			</div>
		</section>
	{/if}
</main>

{#if phase === 'photo'}
	<BottomActionBar contentClass="max-w-lg" mobileOnly={false}>
		<div class="flex items-center justify-center gap-2" aria-label="Camera controls">
			<Button
				href="/nutrition/log/{data.date}"
				variant="ghost"
				size="icon"
				class="bottom-action-secondary"
				aria-label="Cancel"
			>
				<X class="size-5" />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				class="bottom-action-secondary"
				onclick={() => fileInput?.click()}
				disabled={processingPhoto}
				aria-label="Choose a photo"
			>
				<ImagePlus class="size-5" />
			</Button>
			<Button
				type="button"
				size="icon"
				onclick={takePhoto}
				disabled={cameraState !== 'ready' || processingPhoto}
				aria-label="Take photo"
			>
				<Camera class="size-5" />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				class="bottom-action-secondary"
				onclick={switchCamera}
				disabled={cameraState !== 'ready' || processingPhoto}
				aria-label="Switch camera"
			>
				<SwitchCamera class="size-5" />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				class="bottom-action-secondary"
				onclick={openDescription}
				disabled={processingPhoto}
				aria-label="Describe meal"
			>
				<FileText class="size-5" />
			</Button>
		</div>
	</BottomActionBar>
{:else if phase === 'description'}
	<BottomActionBar contentClass="max-w-xl" mobileOnly={false}>
		<div class="flex justify-between gap-2">
			<Button
				href="/nutrition/log/{data.date}"
				variant="ghost"
				size="icon"
				class="bottom-action-secondary"
				aria-label="Cancel"
			>
				<X class="size-5" />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				class="bottom-action-secondary"
				onclick={retakePhoto}
				aria-label="Use camera"
			>
				<Camera class="size-5" />
			</Button>
		</div>
	</BottomActionBar>
{:else if phase === 'analyzing' || phase === 'refining' || phase === 'correction'}
	<BottomActionBar contentClass="max-w-xl" mobileOnly={false}>
		<Button
			href="/nutrition/log/{data.date}"
			variant="ghost"
			size="icon"
			class="bottom-action-secondary"
			aria-label="Cancel"
		>
			<X class="size-5" />
		</Button>
	</BottomActionBar>
{:else if phase === 'analysis-error'}
	<BottomActionBar contentClass="max-w-lg" mobileOnly={false}>
		<div class="grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)] gap-2">
			<Button
				href="/nutrition/log/{data.date}"
				variant="ghost"
				size="icon"
				class="bottom-action-secondary"
				aria-label="Cancel"
			>
				<X class="size-5" />
			</Button>
			<Button
				type="button"
				variant="ghost"
				class="px-2 text-sm bottom-action-secondary"
				onclick={analyzeMeal}
			>
				<RefreshCw class="mr-2 size-4" /> Try again
			</Button>
			<Button type="button" class="px-2 text-sm" onclick={editMealSource}>
				{#if selectedImage}
					<Camera class="mr-2 size-4" /> Retake
				{:else}
					<FileText class="mr-2 size-4" /> Edit
				{/if}
			</Button>
		</div>
	</BottomActionBar>
{:else if estimate && (phase === 'review' || phase === 'saving')}
	<BottomActionBar contentClass="max-w-xl" mobileOnly={false}>
		<div
			class="grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)] gap-2"
			aria-label="Confirm meal estimate"
		>
			<Button
				href="/nutrition/log/{data.date}"
				variant="ghost"
				size="icon"
				class="bottom-action-secondary"
				disabled={phase === 'saving'}
				aria-label="Cancel"
			>
				<X class="size-5" />
			</Button>
			<Button
				type="button"
				variant="ghost"
				class="px-2 text-sm bottom-action-secondary"
				onclick={openCorrection}
				disabled={phase === 'saving'}
			>
				Correct it
			</Button>
			<Button
				type="button"
				class="px-2 text-sm"
				onclick={confirmMeal}
				disabled={phase === 'saving'}
			>
				{#if phase === 'saving'}
					<Spinner class="mr-2 size-4" /> Adding…
				{:else}
					<Check class="mr-2 size-4" /> Add meal
				{/if}
			</Button>
		</div>
	</BottomActionBar>
{/if}

<style>
	:global([data-bottom-action-bar] [data-slot='button'].bottom-action-secondary) {
		background: color-mix(in srgb, var(--text) 8%, transparent) !important;
		color: var(--text) !important;
	}

	:global([data-bottom-action-bar] [data-slot='button'].bottom-action-secondary:hover) {
		background: color-mix(in srgb, var(--text) 12%, transparent) !important;
	}
</style>
