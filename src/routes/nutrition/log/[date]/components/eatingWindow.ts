export type EatingWindowSchedule = {
	start: string;
	end: string;
};

export function eatingWindowState(schedule: EatingWindowSchedule, now: Date) {
	const open = isEatingWindowOpen(schedule, now);
	return {
		open,
		status: open ? 'Eating window open' : 'Eating window closed',
		schedule: `${formatTime(schedule.start)}–${formatTime(schedule.end)} daily`
	};
}

function isEatingWindowOpen(schedule: EatingWindowSchedule, now: Date) {
	const currentMinute = now.getHours() * 60 + now.getMinutes();
	return (
		currentMinute >= minutesFromTime(schedule.start) &&
		currentMinute < minutesFromTime(schedule.end)
	);
}

function formatTime(time: string) {
	const [hour, minute] = time.split(':').map(Number);
	return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(
		new Date(2000, 0, 1, hour, minute)
	);
}

function minutesFromTime(time: string) {
	const [hour, minute] = time.split(':').map(Number);
	return hour * 60 + minute;
}
