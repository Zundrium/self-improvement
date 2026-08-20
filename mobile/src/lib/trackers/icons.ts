import {
	Apple,
	Droplet,
	Dumbbell,
	Flower2,
	Footprints,
	Moon,
	Smile,
	Smartphone,
	Wind
} from '@lucide/svelte';
import type { TrackerId } from './registry';

export const trackerIcons = {
	steps: Footprints,
	sleep: Moon,
	'screen-time': Smartphone,
	fitness: Dumbbell,
	nutrition: Apple,
	meditation: Flower2,
	breathing: Wind,
	happiness: Smile,
	period: Droplet
} satisfies Record<TrackerId, typeof Footprints>;
