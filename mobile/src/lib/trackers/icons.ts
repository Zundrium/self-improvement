import type { Component } from 'svelte';
import {
	Apple,
	Droplet,
	Dumbbell,
	Footprints,
	Moon,
	Smile,
	Smartphone,
	Wind
} from '@lucide/svelte';
import MeditationIcon from './meditationIcon.svelte';
import type { TrackerId } from './registry';

export type TrackerIconComponent = Component<{ class?: string }>;

export const trackerIcons = {
	steps: Footprints,
	sleep: Moon,
	'screen-time': Smartphone,
	fitness: Dumbbell,
	nutrition: Apple,
	meditation: MeditationIcon,
	breathing: Wind,
	happiness: Smile,
	period: Droplet
} satisfies Record<TrackerId, TrackerIconComponent>;
