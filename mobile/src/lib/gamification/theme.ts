export const gamificationColors = {
	glimmers: { primary: '#d4a017', secondary: '#0d0d0d' }
} as const;

export function gameGradient(colors: { primary: string; secondary: string }) {
	return `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`;
}
