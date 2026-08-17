import birdsUrl from './sounds/birds.mp3?url';
import cricketsUrl from './sounds/crickets.mp3?url';
import fireUrl from './sounds/fire.mp3?url';
import rainUrl from './sounds/rain.mp3?url';
import singingBowlUrl from './sounds/singing_bowl_0.3.mp3?url';
import waterstreamUrl from './sounds/waterstream.mp3?url';
import windUrl from './sounds/wind.mp3?url';

export const ambientSounds = [
	{ id: 'rain', label: 'Rain', url: rainUrl },
	{ id: 'wind', label: 'Wind', url: windUrl },
	{ id: 'birds', label: 'Birdsong', url: birdsUrl },
	{ id: 'waterstream', label: 'Water', url: waterstreamUrl },
	{ id: 'fire', label: 'Fire', url: fireUrl },
	{ id: 'crickets', label: 'Crickets', url: cricketsUrl }
] as const;

export { singingBowlUrl };
