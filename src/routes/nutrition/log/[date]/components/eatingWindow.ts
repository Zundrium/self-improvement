import { isEatingWindowOpen, type EatingWindowSchedule } from '../../../nutrition';

export function eatingWindowState(schedule: EatingWindowSchedule, now: Date) {
	const currentMinute = now.getHours() * 60 + now.getMinutes();
	const open = isEatingWindowOpen(schedule, currentMinute);
	return {
		open,
		status: open ? 'Eating window open' : 'Eating window closed',
		schedule: `${formatTime(schedule.start)}–${formatTime(schedule.end)} daily`
	};
}

function formatTime(time: string) {
	const [hour, minute] = time.split(':').map(Number);
	return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(
		new Date(2000, 0, 1, hour, minute)
	);
}
