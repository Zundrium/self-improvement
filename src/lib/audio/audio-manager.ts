import { audioVolumeState } from './audio-volume.svelte';

type LoopSound = {
	audio: HTMLAudioElement;
	active: boolean;
	animationFrame?: number;
};

type OneShot = {
	finish: (completed: boolean) => void;
	volume: number;
};

export class AudioManager {
	private loops = new Map<string, LoopSound>();
	private oneShots = new Map<HTMLAudioElement, OneShot>();
	private preloaded = new Map<string, HTMLAudioElement>();
	private volume = 0.7;
	private muted = false;
	private destroyed = false;
	private unregisterVolume = audioVolumeState.register(this);

	addLoop(id: string, url: string) {
		const audio = this.createAudio(url, 'none');
		audio.loop = true;
		audio.volume = 0;
		this.loops.set(id, { audio, active: false });
	}

	async toggleLoop(id: string) {
		if (this.destroyed) return false;
		const sound = this.loops.get(id);
		if (!sound) return false;
		return sound.active ? this.stopLoop(sound) : this.startLoop(sound);
	}

	async preload(urls: string[]) {
		for (const url of urls) this.preloadAudio(url);
	}

	async play(url: string, volume = 1): Promise<boolean> {
		if (this.destroyed) return false;
		const audio = this.createOneShot(url, volume);
		const completion = this.trackOneShot(audio, volume);
		try {
			await audio.play();
			return await completion;
		} catch (cause) {
			this.finishOneShot(audio);
			console.error(`Could not play ${url}:`, cause);
			return false;
		}
	}

	setVolume(volume: number) {
		this.volume = clamp(volume);
		this.updateLoops();
		this.updateOneShots();
	}

	setMuted(muted: boolean) {
		this.muted = muted;
		this.updateLoops();
		this.updateOneShots();
	}

	stopAll() {
		for (const audio of this.oneShots.keys()) {
			audio.pause();
			this.finishOneShot(audio, false);
		}
	}

	destroy() {
		if (this.destroyed) return;
		this.destroyed = true;
		this.unregisterVolume();
		this.stopAll();
		for (const sound of this.loops.values()) this.destroyLoop(sound);
		this.loops.clear();
		this.preloaded.clear();
	}

	private get outputVolume() {
		return this.muted ? 0 : this.volume;
	}

	private createAudio(url: string, preload: 'auto' | 'none') {
		const audio = new Audio(url);
		audio.preload = preload;
		return audio;
	}

	private preloadAudio(url: string) {
		if (this.preloaded.has(url)) return;
		const audio = this.createAudio(url, 'auto');
		audio.load();
		this.preloaded.set(url, audio);
	}

	private createOneShot(url: string, volume: number) {
		const cached = this.preloaded.get(url);
		const audio = cached ? (cached.cloneNode(true) as HTMLAudioElement) : new Audio(url);
		audio.volume = this.outputVolume * clamp(volume);
		return audio;
	}

	private trackOneShot(audio: HTMLAudioElement, volume: number) {
		return new Promise<boolean>((resolve) => {
			const finish = (completed: boolean) => {
				audio.removeEventListener('ended', onEnded);
				audio.removeEventListener('error', onError);
				this.oneShots.delete(audio);
				resolve(completed);
			};
			const onEnded = () => finish(true);
			const onError = () => finish(false);
			this.oneShots.set(audio, { finish, volume: clamp(volume) });
			audio.addEventListener('ended', onEnded, { once: true });
			audio.addEventListener('error', onError, { once: true });
		});
	}

	private finishOneShot(audio: HTMLAudioElement, completed = false) {
		this.oneShots.get(audio)?.finish(completed);
	}

	private updateOneShots() {
		for (const [audio, sound] of this.oneShots) {
			audio.volume = this.outputVolume * sound.volume;
		}
	}

	private async startLoop(sound: LoopSound) {
		sound.active = true;
		try {
			if (sound.audio.paused) await sound.audio.play();
		} catch (cause) {
			sound.active = false;
			throw cause;
		}
		this.fade(sound, this.outputVolume);
		return true;
	}

	private stopLoop(sound: LoopSound) {
		sound.active = false;
		this.fade(sound, 0, () => this.pauseLoop(sound));
		return false;
	}

	private updateLoops() {
		for (const sound of this.loops.values()) {
			if (sound.active) this.fade(sound, this.outputVolume, undefined, 150);
		}
	}

	private pauseLoop(sound: LoopSound) {
		if (sound.active) return;
		sound.audio.pause();
		sound.audio.currentTime = 0;
	}

	private destroyLoop(sound: LoopSound) {
		if (sound.animationFrame) cancelAnimationFrame(sound.animationFrame);
		sound.audio.pause();
		sound.audio.src = '';
	}

	private fade(sound: LoopSound, target: number, done?: () => void, duration = 800) {
		if (sound.animationFrame) cancelAnimationFrame(sound.animationFrame);
		const initialVolume = sound.audio.volume;
		const startedAt = performance.now();
		const animate = (now: number) => {
			const progress = Math.min(1, (now - startedAt) / duration);
			sound.audio.volume = initialVolume + (target - initialVolume) * progress;
			if (progress < 1) sound.animationFrame = requestAnimationFrame(animate);
			else done?.();
		};
		sound.animationFrame = requestAnimationFrame(animate);
	}
}

function clamp(value: number) {
	return Math.max(0, Math.min(1, value));
}
