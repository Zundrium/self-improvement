export type CameraFacingMode = 'environment' | 'user';

export function createCameraStartup() {
	let current = 0;

	return {
		begin: () => ++current,
		isCurrent: (attempt: number) => attempt === current,
		cancel: () => ++current
	};
}

export function cameraVideoConstraints(facingMode: CameraFacingMode): MediaTrackConstraints {
	return {
		facingMode: { ideal: facingMode },
		width: { ideal: 1080 },
		height: { ideal: 720 },
		frameRate: { ideal: 30 }
	};
}
