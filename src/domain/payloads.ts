export type StepsPayload = {
	timestamp: string;
	app_version: string;
	steps: Array<{
		count: number;
		start_time: string;
		end_time: string;
	}>;
};

export type SleepPayload = {
	timestamp: string;
	app_version: string;
	source: 'usage_events';
	dates: string[];
	activity_intervals: Array<{
		package: string;
		name: string;
		start_time: string;
		end_time: string;
	}>;
	screen_interactive: string[];
};

export type ScreenTimePayload = {
	timestamp: string;
	app_version: string;
	source: 'screen_time';
	screen_time: Array<{
		date: string;
		total_screen_time_minutes: number;
		apps: Array<{
			package: string;
			name: string;
			minutes: number;
			last_used: string;
		}>;
	}>;
};
