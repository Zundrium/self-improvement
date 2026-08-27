type AudioVolumeTarget = {
	setVolume: (volume: number) => void;
	setMuted: (muted: boolean) => void;
};

const VOLUME_KEY = 'audio-volume';
const MUTED_KEY = 'audio-muted';

class AudioVolumeState {
	volume = $state(0.7);
	muted = $state(false);
	private targets = new Set<AudioVolumeTarget>();
	private hydrated = false;

	hydrate() {
		if (this.hydrated) return;
		this.hydrated = true;
		const storedVolume = localStorage.getItem(VOLUME_KEY);
		const savedVolume = Number(storedVolume);
		if (storedVolume !== null && Number.isFinite(savedVolume)) this.volume = clamp(savedVolume);
		this.muted = localStorage.getItem(MUTED_KEY) === 'true';
		this.updateTargets();
	}

	register(target: AudioVolumeTarget) {
		this.targets.add(target);
		target.setVolume(this.volume);
		target.setMuted(this.muted);
		return () => this.targets.delete(target);
	}

	setVolume(volume: number) {
		this.volume = clamp(volume);
		localStorage.setItem(VOLUME_KEY, String(this.volume));
		this.updateTargets();
	}

	toggleMuted() {
		this.muted = !this.muted;
		localStorage.setItem(MUTED_KEY, String(this.muted));
		this.updateTargets();
	}

	private updateTargets() {
		for (const target of this.targets) {
			target.setVolume(this.volume);
			target.setMuted(this.muted);
		}
	}
}

export const audioVolumeState = new AudioVolumeState();

function clamp(value: number) {
	return Math.max(0, Math.min(1, value));
}
