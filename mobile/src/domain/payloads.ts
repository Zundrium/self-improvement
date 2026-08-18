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
	sleep: Array<{
		session_end_time: string;
		duration_seconds: number;
		stages: Array<{
			stage: string;
			start_time: string;
			end_time: string;
			duration_seconds: number;
		}>;
		metadata?: { data_origin: string };
	}>;
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
