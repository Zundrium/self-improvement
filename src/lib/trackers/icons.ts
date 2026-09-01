import type { Component } from 'svelte';
import {
	Apple,
	BrushCleaning,
	Droplet,
	Dumbbell,
	Footprints,
	Moon,
	PersonStanding,
	Smile,
	Smartphone,
	Wind
} from '@lucide/svelte';
import MeditationIcon from './meditationIcon.svelte';
import type { AppTrackerId } from './registry';

export type TrackerIconComponent = Component<{ class?: string }>;

export const trackerIcons = {
	steps: Footprints,
	sleep: Moon,
	'screen-time': Smartphone,
	fitness: Dumbbell,
	nutrition: Apple,
	meditation: MeditationIcon,
	breathing: Wind,
	stretch: PersonStanding,
	chores: BrushCleaning,
	happiness: Smile,
	period: Droplet
} satisfies Record<AppTrackerId, TrackerIconComponent>;
