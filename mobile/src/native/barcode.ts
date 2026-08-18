import {
	BarcodeFormat,
	BarcodeScanner,
	GoogleBarcodeScannerModuleInstallState,
	type GoogleBarcodeScannerModuleInstallProgressEvent
} from '@capacitor-mlkit/barcode-scanning';
import { SyncFailure } from '../domain/errors';
import { requireNativeAndroid } from './platform';

const INSTALL_TIMEOUT_MS = 90_000;

export async function scanPairingQrCode() {
	requireNativeAndroid();
	await ensureScannerAvailable();
	const { barcodes } = await BarcodeScanner.scan({
		formats: [BarcodeFormat.QrCode],
		autoZoom: true
	});
	const value = barcodeValue(barcodes[0]);
	if (!value) throw new SyncFailure('pairing', 'No pairing QR code was scanned.', false);
	return value;
}

async function ensureScannerAvailable() {
	const { supported } = await BarcodeScanner.isSupported();
	if (!supported) throw scannerFailure('QR scanning is not supported on this device.');
	const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
	if (!available) await installScannerModule();
}

async function installScannerModule() {
	const installation = scannerInstallation();
	let removeListener: (() => Promise<void>) | undefined;
	try {
		const listener = await BarcodeScanner.addListener(
			'googleBarcodeScannerModuleInstallProgress',
			installation.onProgress
		);
		removeListener = () => listener.remove();
		await BarcodeScanner.installGoogleBarcodeScannerModule();
		await installation.completed;
	} catch (cause) {
		if (cause instanceof SyncFailure) throw cause;
		throw scannerFailure();
	} finally {
		installation.cancel();
		await removeListener?.();
	}
}

function scannerInstallation() {
	let resolve!: () => void;
	let reject!: (cause: unknown) => void;
	const completed = new Promise<void>((accept, decline) => {
		resolve = accept;
		reject = decline;
	});
	const timeout = setTimeout(() => reject(scannerFailure()), INSTALL_TIMEOUT_MS);
	return { completed, onProgress, cancel: () => clearTimeout(timeout) };

	function onProgress(event: GoogleBarcodeScannerModuleInstallProgressEvent) {
		if (event.state === GoogleBarcodeScannerModuleInstallState.COMPLETED) resolve();
		if (isFailedInstall(event.state)) reject(scannerFailure());
	}
}

function isFailedInstall(state: GoogleBarcodeScannerModuleInstallState) {
	return (
		state === GoogleBarcodeScannerModuleInstallState.CANCELED ||
		state === GoogleBarcodeScannerModuleInstallState.FAILED
	);
}

function barcodeValue(barcode?: { rawValue?: string; displayValue: string; bytes?: number[] }) {
	if (!barcode) return '';
	if (barcode.rawValue) return barcode.rawValue;
	if (barcode.displayValue) return barcode.displayValue;
	return barcode.bytes ? new TextDecoder().decode(new Uint8Array(barcode.bytes)) : '';
}

function scannerFailure(message = 'The QR scanner could not be prepared. Try again.') {
	return new SyncFailure('pairing', message, true);
}
