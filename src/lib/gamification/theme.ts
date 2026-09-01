export const gamificationColors = {
	glimmers: { primary: '#d4a017', secondary: '#f97316', tertiary: '#ec4899' }
} as const;

export function gameGradient(colors: { primary: string; secondary: string; tertiary: string }) {
	return `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 52%, ${colors.tertiary} 100%)`;
}
