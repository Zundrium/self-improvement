export const gamificationColors = {
	glimmers: {
		primary: 'var(--gamification-glimmers-primary)',
		secondary: 'var(--gamification-glimmers-secondary)',
		tertiary: 'var(--gamification-glimmers-tertiary)'
	}
} as const;

export function gameGradient(colors: { primary: string; secondary: string; tertiary: string }) {
	return `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 52%, ${colors.tertiary} 100%)`;
}
