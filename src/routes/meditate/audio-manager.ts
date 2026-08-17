type ManagedSound = {
	audio: HTMLAudioElement;
	active: boolean;
	animationFrame?: number;
};

export class AmbientAudioManager {
	private sounds = new Map<string, ManagedSound>();
	private oneShots = new Set<HTMLAudioElement>();
	private volume = 0.7;
	private muted = false;

	addSound(id: string, url: string) {
		const audio = new Audio(url);
		audio.loop = true;
		audio.preload = 'none';
		audio.volume = 0;
		this.sounds.set(id, { audio, active: false });
	}

	async toggleSound(id: string) {
		const sound = this.sounds.get(id);
		if (!sound) return false;
		return sound.active ? this.stopSound(sound) : this.startSound(sound);
	}

	setVolume(volume: number) {
		this.volume = Math.max(0, Math.min(1, volume));
		this.updateActiveSounds();
	}

	setMuted(muted: boolean) {
		this.muted = muted;
		this.updateActiveSounds();
		for (const audio of this.oneShots) audio.volume = this.outputVolume;
	}

	async playOnce(url: string) {
		const audio = new Audio(url);
		audio.volume = this.outputVolume;
		this.oneShots.add(audio);
		audio.addEventListener('ended', () => this.oneShots.delete(audio), { once: true });
		try {
			await audio.play();
		} catch (cause) {
			this.oneShots.delete(audio);
			throw cause;
		}
	}

	destroy() {
		for (const sound of this.sounds.values()) this.destroySound(sound);
		for (const audio of this.oneShots) audio.pause();
		this.sounds.clear();
		this.oneShots.clear();
	}

	private get outputVolume() {
		return this.muted ? 0 : this.volume;
	}

	private async startSound(sound: ManagedSound) {
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

	private stopSound(sound: ManagedSound) {
		sound.active = false;
		this.fade(sound, 0, () => this.pauseSound(sound));
		return false;
	}

	private updateActiveSounds() {
		for (const sound of this.sounds.values()) {
			if (sound.active) this.fade(sound, this.outputVolume, undefined, 150);
		}
	}

	private pauseSound(sound: ManagedSound) {
		if (sound.active) return;
		sound.audio.pause();
		sound.audio.currentTime = 0;
	}

	private destroySound(sound: ManagedSound) {
		if (sound.animationFrame) cancelAnimationFrame(sound.animationFrame);
		sound.audio.pause();
		sound.audio.src = '';
	}

	private fade(sound: ManagedSound, target: number, done?: () => void, duration = 800) {
		if (sound.animationFrame) cancelAnimationFrame(sound.animationFrame);
		const startVolume = sound.audio.volume;
		const startedAt = performance.now();
		const animate = (now: number) => {
			const progress = Math.min(1, (now - startedAt) / duration);
			sound.audio.volume = startVolume + (target - startVolume) * progress;
			if (progress < 1) sound.animationFrame = requestAnimationFrame(animate);
			else done?.();
		};
		sound.animationFrame = requestAnimationFrame(animate);
	}
}
