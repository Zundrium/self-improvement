export type CameraFacingMode = 'environment' | 'user';

export function cameraVideoConstraints(facingMode: CameraFacingMode): MediaTrackConstraints {
	return {
		facingMode: { ideal: facingMode },
		width: { ideal: 1080 },
		height: { ideal: 720 },
		frameRate: { ideal: 30 }
	};
}
