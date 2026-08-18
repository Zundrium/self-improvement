import adapter from '@sveltejs/adapter-static';

const config = {
	kit: {
		adapter: adapter({
			pages: '../dist-mobile',
			assets: '../dist-mobile',
			fallback: 'index.html'
		}),
		alias: {
			$domain: './src/domain',
			$native: './src/native'
		}
	}
};

export default config;
