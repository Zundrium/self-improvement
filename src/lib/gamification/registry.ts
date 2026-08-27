import { gamificationColors } from './theme';

export const shopFeature = {
	id: 'glimmers',
	label: 'Glimmers',
	href: '/shop',
	settingsHref: '/shop/settings',
	colors: gamificationColors.glimmers
} as const;

export function getShopFeatureForPathname(pathname: string) {
	return pathname === shopFeature.href || pathname.startsWith(`${shopFeature.href}/`)
		? shopFeature
		: undefined;
}

export function getShopColorsForPathname(pathname: string) {
	return getShopFeatureForPathname(pathname)?.colors;
}
