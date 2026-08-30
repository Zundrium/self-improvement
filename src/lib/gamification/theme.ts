export const gamificationColors = {
	glimmers: { primary: '#d4a017', secondary: '#f97316' }
} as const;

export function gameGradient(colors: { primary: string; secondary: string }) {
	return `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`;
}
