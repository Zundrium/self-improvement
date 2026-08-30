<script lang="ts">
import { onMount } from 'svelte';
import type { TrackerColors } from '$lib/trackers/registry';

type Props = {
	colors: TrackerColors;
};

let { colors }: Props = $props();

const shaderSettings = {
	opacity: 0.3,
	animationSpeed: 1.0,
	curtainFrequency: 2.4,
	detailFrequency: 8.5,
	verticalWarp: 1.95,
	flowSpeed: 10,
	shapeEvolution: 0.12,
	shapeVariation: 0.85,
	colorEvolution: 0.09,
	minimumReach: 0.6,
	reachVariation: 0.36,
	edgeSoftness: 0.2,
	bottomFadeHeight: 0.6,
	topGlowDepth: 2.6,
	glowIntensity: 1,
	maxPixelDensity: 1.5
};

let canvas: HTMLCanvasElement;
let initialized = $state(false);
let gl: WebGLRenderingContext | null = null;
let program: WebGLProgram | null = null;
let buffer: WebGLBuffer | null = null;
let animationFrameId = 0;
let startTime = 0;
let prefersReducedMotion = false;
let primaryLocation: WebGLUniformLocation | null = null;
let secondaryLocation: WebGLUniformLocation | null = null;
let resolutionLocation: WebGLUniformLocation | null = null;
let timeLocation: WebGLUniformLocation | null = null;

const vertexShader = `
		attribute vec2 position;

		void main() {
			gl_Position = vec4(position, 0.0, 1.0);
		}
	`;

const fragmentShader = `
		precision highp float;

		uniform vec3 iResolution;
		uniform float iTime;
		uniform vec3 primaryColor;
		uniform vec3 secondaryColor;

		float hash(vec2 position) {
			return fract(sin(dot(position, vec2(127.1, 311.7))) * 43758.5453);
		}

		float noise(vec2 position) {
			vec2 cell = floor(position);
			vec2 offset = fract(position);
			vec2 curve = offset * offset * (3.0 - 2.0 * offset);
			float bottom = mix(hash(cell), hash(cell + vec2(1.0, 0.0)), curve.x);
			float top = mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0)), curve.x);
			return mix(bottom, top, curve.y);
		}

		float fbm(vec2 position) {
			float value = 0.0;
			value += noise(position) * 0.5;
			position = position * 2.03 + 17.1;
			value += noise(position) * 0.25;
			position = position * 2.01 + 9.7;
			value += noise(position) * 0.125;
			position = position * 2.04 + 4.3;
			value += noise(position) * 0.0625;
			return value;
		}

		void main() {
			vec2 uv = gl_FragCoord.xy / iResolution.xy;
			float ratio = iResolution.x / iResolution.y;
			float fromTop = 1.0 - uv.y;
			float x = (uv.x - 0.5) * ratio;
			float flowTime = iTime * ${glslFloat(shaderSettings.flowSpeed)};
			float evolutionTime = flowTime * ${glslFloat(shaderSettings.shapeEvolution)};
			vec2 slowDrift = vec2(
				sin(evolutionTime * 0.73) + sin(evolutionTime * 0.31 + 2.4) * 0.45,
				cos(evolutionTime * 0.59) + cos(evolutionTime * 0.23 + 1.1) * 0.4
			);
			vec2 fineDrift = vec2(
				cos(evolutionTime * 0.47 + 0.8) + sin(evolutionTime * 0.19) * 0.5,
				sin(evolutionTime * 0.67 + 2.1) + cos(evolutionTime * 0.29) * 0.35
			);
			float slowNoise = fbm(vec2(
				x * 1.35 + slowDrift.x * 0.34,
				fromTop * 1.5 + slowDrift.y * 0.28
			));
			float fineNoise = fbm(vec2(
				x * 2.7 + fineDrift.x * 0.3,
				fromTop * 3.0 + fineDrift.y * 0.24
			));
			float frequencyBreath = 1.0 + sin(evolutionTime * 0.37 + 0.6) * 0.14;
			float spatialBend = (
				sin(x * 2.3 + fromTop * 1.1 + evolutionTime * 0.41) * 0.58 +
				sin(fromTop * 4.1 - evolutionTime * 0.29 + slowNoise * 1.7) * 0.42
			) * ${glslFloat(shaderSettings.shapeVariation)};
			float phaseWander =
				sin(evolutionTime * 0.53) * 1.05 +
				sin(evolutionTime * 0.23 + 2.1) * 0.72;
			float flowPhase =
				x * ${glslFloat(shaderSettings.curtainFrequency)} * frequencyBreath +
				fromTop * ${glslFloat(shaderSettings.verticalWarp)} +
				slowNoise * (1.8 + sin(evolutionTime * 0.17) * 0.55) +
				spatialBend +
				phaseWander;
			float broadWave =
				sin(flowPhase) * 0.64 +
				sin(flowPhase * 0.61 - x * 2.4 + fromTop * 1.7 + evolutionTime * 0.37) * 0.36;
			float broadFold = 0.5 + broadWave * 0.5;
			float detailPhase =
				x * ${glslFloat(shaderSettings.detailFrequency)} *
					(0.9 + cos(evolutionTime * 0.41) * 0.12) -
				fromTop * (2.4 + sin(evolutionTime * 0.33) * 0.65) -
				fineNoise * 1.8 +
				sin(flowPhase * 0.42 + evolutionTime * 0.31) * 0.9;
			float fineWave =
				sin(detailPhase) * 0.65 +
				sin(detailPhase * 0.53 + flowPhase * 0.2) * 0.35;
			float fineFold = 0.5 + fineWave * 0.5;
			float reachNoise = noise(vec2(
				x * 1.8 + slowDrift.x * 0.45,
				slowDrift.y * 0.6 + sin(evolutionTime * 0.17) * 0.4
			));
			float reach =
				${glslFloat(shaderSettings.minimumReach)} +
				reachNoise * ${glslFloat(shaderSettings.reachVariation)};
			float broadReach = 1.0 - smoothstep(
				reach - ${glslFloat(shaderSettings.edgeSoftness)},
				reach,
				fromTop
			);
			float deepReach = 1.0 - smoothstep(reach * 0.75, 1.0, fromTop);
			float topGlow = exp(-fromTop * ${glslFloat(shaderSettings.topGlowDepth)}) *
				(0.45 + slowNoise * 0.65);
			float bottomFade = smoothstep(
				0.0,
				${glslFloat(shaderSettings.bottomFadeHeight)},
				uv.y
			);
			float aurora =
				broadReach * (0.18 + broadFold * 0.42 + slowNoise * 0.18) +
				deepReach * fineFold * 0.24 +
				topGlow * 0.31;
			float colorTime = flowTime * ${glslFloat(shaderSettings.colorEvolution)};
			float colorNoise = fbm(vec2(
				x * 1.6 + sin(colorTime * 0.47) * 0.5,
				fromTop * 1.2 + cos(colorTime * 0.31) * 0.4
			));
			float colorPosition = clamp(
				0.5 +
				sin(flowPhase * 0.3 + colorNoise * 3.0 + sin(colorTime * 0.67)) * 0.32 +
				(colorNoise - 0.5) * 0.4,
				0.0,
				1.0
			);
			vec3 auroraColor = mix(primaryColor, secondaryColor, colorPosition);
			auroraColor = mix(auroraColor, vec3(1.0), 0.07 + broadFold * 0.12);
			float auroraAlpha = clamp(
				aurora * bottomFade * ${glslFloat(shaderSettings.glowIntensity)},
				0.0,
				0.9
			);

			gl_FragColor = vec4(auroraColor, auroraAlpha);
		}
	`;

$effect(() => {
	colors.primary;
	colors.secondary;
	if (gl && program && prefersReducedMotion) requestRender();
});

function glslFloat(value: number) {
	return Number.isInteger(value) ? `${value}.0` : String(value);
}

function createShader(type: number, source: string) {
	if (!gl) return null;
	const shader = gl.createShader(type);
	if (!shader) return null;
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
	console.error('Tracker shader compile error:', gl.getShaderInfoLog(shader));
	gl.deleteShader(shader);
	return null;
}

function initializeWebGl() {
	gl = canvas.getContext('webgl', {
		alpha: true,
		antialias: false,
		premultipliedAlpha: false,
		powerPreference: 'low-power'
	});
	if (!gl) return false;

	const vertex = createShader(gl.VERTEX_SHADER, vertexShader);
	const fragment = createShader(gl.FRAGMENT_SHADER, fragmentShader);
	if (!vertex || !fragment) return false;

	program = gl.createProgram();
	if (!program) return false;
	gl.attachShader(program, vertex);
	gl.attachShader(program, fragment);
	gl.linkProgram(program);
	gl.deleteShader(vertex);
	gl.deleteShader(fragment);

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.error('Tracker shader link error:', gl.getProgramInfoLog(program));
		return false;
	}

	buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

	const positionLocation = gl.getAttribLocation(program, 'position');
	gl.enableVertexAttribArray(positionLocation);
	gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

	primaryLocation = gl.getUniformLocation(program, 'primaryColor');
	secondaryLocation = gl.getUniformLocation(program, 'secondaryColor');
	resolutionLocation = gl.getUniformLocation(program, 'iResolution');
	timeLocation = gl.getUniformLocation(program, 'iTime');
	return true;
}

function resizeCanvas() {
	const bounds = canvas.getBoundingClientRect();
	const density = Math.min(window.devicePixelRatio, shaderSettings.maxPixelDensity);
	const width = Math.max(1, Math.round(bounds.width * density));
	const height = Math.max(1, Math.round(bounds.height * density));
	if (canvas.width === width && canvas.height === height) return;
	canvas.width = width;
	canvas.height = height;
	if (prefersReducedMotion) requestRender();
}

function render(timestamp: number) {
	if (!gl || !program || document.hidden) return;
	if (!startTime) startTime = timestamp;

	const time = prefersReducedMotion
		? 0
		: (timestamp - startTime) * 0.001 * shaderSettings.animationSpeed;

	gl.viewport(0, 0, canvas.width, canvas.height);
	gl.useProgram(program);
	setColorUniform(primaryLocation, colors.primary);
	setColorUniform(secondaryLocation, colors.secondary);
	if (resolutionLocation) gl.uniform3f(resolutionLocation, canvas.width, canvas.height, 1);
	if (timeLocation) gl.uniform1f(timeLocation, time);
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

	if (!prefersReducedMotion) animationFrameId = requestAnimationFrame(render);
}

function requestRender() {
	cancelAnimationFrame(animationFrameId);
	animationFrameId = requestAnimationFrame(render);
}

function setColorUniform(location: WebGLUniformLocation | null, hex: string) {
	if (!gl || !location) return;
	const value = Number.parseInt(hex.slice(1), 16);
	gl.uniform3f(
		location,
		((value >> 16) & 255) / 255,
		((value >> 8) & 255) / 255,
		(value & 255) / 255
	);
}

onMount(() => {
	const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
	prefersReducedMotion = motionPreference.matches;
	const resizeObserver = new ResizeObserver(resizeCanvas);
	const handleMotionPreference = (event: MediaQueryListEvent) => {
		prefersReducedMotion = event.matches;
		startTime = 0;
		requestRender();
	};
	const handleVisibility = () => {
		if (document.hidden) cancelAnimationFrame(animationFrameId);
		else requestRender();
	};

	resizeObserver.observe(canvas);
	motionPreference.addEventListener('change', handleMotionPreference);
	document.addEventListener('visibilitychange', handleVisibility);
	resizeCanvas();
	if (initializeWebGl()) {
		initialized = true;
		requestRender();
	}

	return () => {
		cancelAnimationFrame(animationFrameId);
		resizeObserver.disconnect();
		motionPreference.removeEventListener('change', handleMotionPreference);
		document.removeEventListener('visibilitychange', handleVisibility);
		if (gl && buffer) gl.deleteBuffer(buffer);
		if (gl && program) gl.deleteProgram(program);
	};
});
</script>

<canvas
	bind:this={canvas}
	class="pointer-events-none absolute inset-0 -z-10 size-full"
	style={`background: ${initialized ? 'transparent' : `linear-gradient(to bottom, ${colors.primary}, ${colors.secondary} 35%, transparent)`}; opacity: ${shaderSettings.opacity}`}
	aria-hidden="true"
></canvas>
