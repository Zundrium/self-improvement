import type { AchievementCategory } from '$lib/local/gamification/model';
import { type AppTrackerId, appTrackers } from '$lib/trackers/registry';

export const TRACKER_MILESTONE_TARGETS = [1, 5, 10, 20, 50, 100] as const;

export type TrackerSpecialMetric =
	| 'steps-10k'
	| 'steps-20k'
	| 'steps-double-goal'
	| 'sleep-zero-late-usage'
	| 'sleep-streak'
	| 'screen-time-half-limit'
	| 'screen-time-streak'
	| 'fitness-complete-program'
	| 'fitness-morning-workout'
	| 'fitness-return-after-cycle'
	| 'nutrition-profile-configured'
	| 'nutrition-photo-meal'
	| 'nutrition-fasting-day'
	| 'meditation-long-session'
	| 'meditation-total-time'
	| 'breathing-478'
	| 'breathing-streak'
	| 'breathing-total-time'
	| 'stretch-hard-variation'
	| 'stretch-long-hold'
	| 'stretch-full-week'
	| 'happiness-top-rating'
	| 'happiness-reason'
	| 'period-notes'
	| 'period-cycle-history'
	| 'period-cycle-starts';

export type CombinationMetric =
	| 'stretch-then-fitness'
	| 'fitness-meditation'
	| 'nutrition-fitness'
	| 'stretch-breathing-meditation'
	| 'screen-time-sleep'
	| 'steps-nutrition-screen-time-sleep'
	| 'fitness-happiness-four'
	| 'meditation-nutrition'
	| 'low-happiness-then-calm'
	| 'fitness-then-sleep';

export type StateAchievementMetric = 'reward-count' | 'redemption-count';

export type AchievementMetric =
	| { type: 'tracker-completions'; trackerId: AppTrackerId }
	| { type: 'score' }
	| { type: 'best-streak' }
	| { type: 'all-trackers-ever' }
	| { type: 'trackers-same-day' }
	| { type: 'perfect-days' }
	| { type: 'tracker-special'; key: TrackerSpecialMetric; value?: string }
	| { type: 'combination'; key: CombinationMetric }
	| { type: 'state'; key: StateAchievementMetric }
	| { type: 'event' };

export type AchievementDefinition = {
	id: string;
	title: string;
	description: string;
	icon: string;
	category: AchievementCategory;
	trackerId?: AppTrackerId;
	target: number;
	metric: AchievementMetric;
};

type TrackerCatalogDetails = {
	titles: readonly [string, string, string, string, string, string];
	icons: readonly [string, string, string, string, string, string];
};

const trackerCatalogDetails: Record<AppTrackerId, TrackerCatalogDetails> = {
	steps: {
		titles: [
			'First Steps',
			'Finding Your Feet',
			'In Stride',
			'Momentum',
			'Going Places',
			'Century Walker'
		],
		icons: ['Footprints', 'Route', 'Milestone', 'Map', 'MapPinned', 'Goal']
	},
	sleep: {
		titles: [
			'Good Night',
			'Dream Starter',
			'Rested Rhythm',
			'Sleep Regular',
			'Dream Keeper',
			'Century of Rest'
		],
		icons: ['Moon', 'Bed', 'BedDouble', 'CloudMoon', 'MoonStar', 'Telescope']
	},
	'screen-time': {
		titles: [
			'First Boundary',
			'Pocket Pause',
			'Attention Back',
			'Intentional Use',
			'Digital Discipline',
			'Screen Sage'
		],
		icons: ['Smartphone', 'PhoneOff', 'MonitorOff', 'AppWindow', 'LaptopMinimal', 'RadioTower']
	},
	fitness: {
		titles: [
			'First Rep',
			'Warming Up',
			'Getting Stronger',
			'Built by Habit',
			'Powerhouse',
			'Fitness Centurion'
		],
		icons: ['Dumbbell', 'BicepsFlexed', 'Activity', 'HeartPulse', 'Trophy', 'Medal']
	},
	nutrition: {
		titles: [
			'First Bite',
			'Well Fed',
			'Food for Thought',
			'Nourished Habit',
			'Kitchen Consistency',
			'Century of Nourishment'
		],
		icons: ['Apple', 'Salad', 'CookingPot', 'Soup', 'Wheat', 'Cherry']
	},
	meditation: {
		titles: [
			'First Stillness',
			'Settling In',
			'Quiet Mind',
			'Inner Space',
			'Deep Practice',
			'Hundred Moments of Calm'
		],
		icons: ['Brain', 'Sparkles', 'WavesHorizontal', 'Flower2', 'Orbit', 'Gem']
	},
	breathing: {
		titles: [
			'First Breath',
			'Fresh Air',
			'Steady Breath',
			'Rhythm Within',
			'Breathwork Habit',
			'Breathe Easy'
		],
		icons: ['Wind', 'Feather', 'AirVent', 'Cloud', 'Tornado', 'Fan']
	},
	stretch: {
		titles: [
			'First Reach',
			'Loosening Up',
			'More Range',
			'Flexible Habit',
			'Limber Life',
			'Century Stretch'
		],
		icons: ['Accessibility', 'PersonStanding', 'Move', 'Move3d', 'Expand', 'Maximize']
	},
	chores: {
		titles: [
			'First Task',
			'Getting Things Done',
			'Tidy Rhythm',
			'Household Habit',
			'Home in Hand',
			'Century of Chores'
		],
		icons: ['BrushCleaning', 'SprayCan', 'WashingMachine', 'House', 'HouseHeart', 'CircleCheckBig']
	},
	happiness: {
		titles: [
			'First Check-in',
			'Noticing More',
			'Mood Mapper',
			'Emotional Insight',
			'Self-Aware',
			'Hundred Honest Moments'
		],
		icons: ['FaceSlightlySmiling', 'FaceGrinning', 'PartyPopper', 'Sun', 'Rainbow', 'Heart']
	},
	period: {
		titles: [
			'First Entry',
			'Finding the Rhythm',
			'Cycle Aware',
			'In Tune',
			'Body Literacy',
			'Century of Care'
		],
		icons: ['Droplet', 'CalendarHeart', 'CalendarDays', 'HeartHandshake', 'ShieldPlus', 'Venus']
	}
};

const overallAchievements: AchievementDefinition[] = [
	definition(
		'first-glimmer',
		'First Glimmer',
		'Earn your first Glimmer.',
		'Lightbulb',
		'overall',
		1,
		{ type: 'score' }
	),
	...scoreAchievements(),
	...streakAchievements(),
	definition(
		'all-trackers-ever',
		'All-Rounder',
		'Complete every tracker at least once.',
		'Grid2x2Check',
		'overall',
		1,
		{ type: 'all-trackers-ever' }
	),
	definition(
		'trackers-same-day-3',
		'Triple Threat',
		'Complete three different trackers on the same day.',
		'Blocks',
		'overall',
		3,
		{ type: 'trackers-same-day' }
	),
	definition(
		'trackers-same-day-5',
		'High Five',
		'Complete five different trackers on the same day.',
		'LayoutGrid',
		'overall',
		5,
		{ type: 'trackers-same-day' }
	),
	definition(
		'perfect-day',
		'Perfect Day',
		'Complete every enabled tracker on the same day.',
		'Star',
		'overall',
		1,
		{ type: 'perfect-days' }
	),
	definition(
		'perfect-days-5',
		'Perfect Rhythm',
		'Complete five perfect days.',
		'StarCheck',
		'overall',
		5,
		{ type: 'perfect-days' }
	)
];

const trackerSpecialAchievements: AchievementDefinition[] = [
	trackerSpecial(
		'steps-10k-day',
		'Ten Thousand Strong',
		'Reach 10,000 steps in one day.',
		'Gauge',
		'steps',
		10_000,
		'steps-10k'
	),
	trackerSpecial(
		'steps-20k-day',
		'Going the Extra Mile',
		'Reach 20,000 steps in one day.',
		'CircleGauge',
		'steps',
		20_000,
		'steps-20k'
	),
	trackerSpecial(
		'steps-double-goal',
		'Goal Crusher',
		'Double your current step goal in one day.',
		'FlagTriangleRight',
		'steps',
		2,
		'steps-double-goal'
	),
	trackerSpecial(
		'sleep-zero-late-usage',
		'Lights Out',
		'Pass a sleep night with no late app usage.',
		'AlarmClockOff',
		'sleep',
		1,
		'sleep-zero-late-usage'
	),
	trackerSpecial(
		'sleep-streak-7',
		'Well Rested',
		'Pass your sleep goal seven days in a row.',
		'CloudMoonRain',
		'sleep',
		7,
		'sleep-streak'
	),
	trackerSpecial(
		'sleep-streak-30',
		'Sleep Sanctuary',
		'Pass your sleep goal thirty days in a row.',
		'LampDesk',
		'sleep',
		30,
		'sleep-streak'
	),
	trackerSpecial(
		'screen-time-half-limit',
		'Half the Noise',
		'Keep tracked screen time at or below half your daily limit.',
		'BatteryLow',
		'screen-time',
		1,
		'screen-time-half-limit'
	),
	trackerSpecial(
		'screen-time-streak-7',
		'Attention Keeper',
		'Stay within your screen limit seven days in a row.',
		'TimerOff',
		'screen-time',
		7,
		'screen-time-streak'
	),
	trackerSpecial(
		'screen-time-streak-30',
		'Digital Discipline',
		'Stay within your screen limit thirty days in a row.',
		'ShieldCheck',
		'screen-time',
		30,
		'screen-time-streak'
	),
	trackerSpecial(
		'fitness-complete-program',
		'Full Circuit',
		'Complete every workout in the fitness program.',
		'BadgeCheck',
		'fitness',
		1,
		'fitness-complete-program'
	),
	trackerSpecial(
		'fitness-morning-workout',
		'Early Power',
		'Complete a workout before noon.',
		'Sunrise',
		'fitness',
		1,
		'fitness-morning-workout'
	),
	trackerSpecial(
		'fitness-return-after-cycle',
		'Back for More',
		'Return for another workout after a full program cycle.',
		'RotateCcw',
		'fitness',
		1,
		'fitness-return-after-cycle'
	),
	trackerSpecial(
		'nutrition-profile-configured',
		'Know Your Fuel',
		'Configure your nutrition profile.',
		'ClipboardCheck',
		'nutrition',
		1,
		'nutrition-profile-configured'
	),
	trackerSpecial(
		'nutrition-photo-meal',
		'Picture of Health',
		'Log a meal with a photo.',
		'Camera',
		'nutrition',
		1,
		'nutrition-photo-meal'
	),
	trackerSpecial(
		'nutrition-fasting-day',
		'Intentional Pause',
		'Complete a full fasting day.',
		'Utensils',
		'nutrition',
		1,
		'nutrition-fasting-day'
	),
	trackerSpecial(
		'meditation-ten-minute-session',
		'Ten Quiet Minutes',
		'Complete a meditation of at least ten minutes.',
		'Hourglass',
		'meditation',
		600,
		'meditation-long-session'
	),
	trackerSpecial(
		'meditation-thirty-minute-session',
		'Deep Stillness',
		'Complete a meditation of at least thirty minutes.',
		'Timer',
		'meditation',
		1_800,
		'meditation-long-session'
	),
	trackerSpecial(
		'meditation-ten-hours-total',
		'Ten Hours Within',
		'Meditate for ten hours in total.',
		'Clock10',
		'meditation',
		36_000,
		'meditation-total-time'
	),
	trackerSpecial(
		'breathing-478',
		'Classic Calm',
		'Complete a 4-7-8 breathing exercise.',
		'WavesVertical',
		'breathing',
		1,
		'breathing-478'
	),
	trackerSpecial(
		'breathing-streak-10',
		'Steady Lungs',
		'Complete breathing practice ten days in a row.',
		'ListRestart',
		'breathing',
		10,
		'breathing-streak'
	),
	trackerSpecial(
		'breathing-one-hour-total',
		'An Hour of Air',
		'Complete one hour of breathing practice in total.',
		'ArchiveRestore',
		'breathing',
		3_600,
		'breathing-total-time'
	),
	trackerSpecial(
		'stretch-hard-variation',
		'Going Deeper',
		'Complete a session using a hard stretch variation.',
		'TrendingUp',
		'stretch',
		1,
		'stretch-hard-variation'
	),
	trackerSpecial(
		'stretch-sixty-second-hold',
		'Long Hold',
		'Complete a stretch session with sixty-second holds.',
		'Ruler',
		'stretch',
		60,
		'stretch-long-hold'
	),
	trackerSpecial(
		'stretch-full-week',
		'Flexible Week',
		'Complete every scheduled weekday in one week.',
		'CalendarFold',
		'stretch',
		5,
		'stretch-full-week'
	),
	trackerSpecial(
		'happiness-five-star-day',
		'A Very Good Day',
		'Record your highest happiness rating.',
		'HeartPlus',
		'happiness',
		5,
		'happiness-top-rating'
	),
	trackerSpecial(
		'happiness-gratitude',
		'Grateful Heart',
		'Choose gratitude in a happiness check-in.',
		'HandHeart',
		'happiness',
		1,
		'happiness-reason',
		'gratitude'
	),
	trackerSpecial(
		'happiness-meaningful-connection',
		'Better Together',
		'Record a meaningful connection.',
		'MessageCircleHeart',
		'happiness',
		1,
		'happiness-reason',
		'meaningful_connection'
	),
	trackerSpecial(
		'period-reflection',
		'Worth Remembering',
		'Add notes to a period entry.',
		'NotebookPen',
		'period',
		1,
		'period-notes'
	),
	trackerSpecial(
		'period-cycle-history',
		'Reading the Rhythm',
		'Build enough history to identify a cycle.',
		'CalendarSearch',
		'period',
		1,
		'period-cycle-history'
	),
	trackerSpecial(
		'period-three-cycle-starts',
		'Body Knowledge',
		'Track three separate cycle starts.',
		'Repeat',
		'period',
		3,
		'period-cycle-starts'
	)
];

const combinationAchievements: AchievementDefinition[] = [
	combination(
		'combination-stretch-then-fitness',
		'Good Preparation Is Half the Work',
		'Complete Stretch and then Fitness on the same day.',
		'ArrowRight',
		'stretch-then-fitness'
	),
	combination(
		'combination-move-and-mind',
		'Body and Mind',
		'Complete Fitness and Meditation on the same day.',
		'BrainCircuit',
		'fitness-meditation'
	),
	combination(
		'combination-fuel-and-train',
		'Fuelled Up',
		'Complete Nutrition and Fitness on the same day.',
		'UtensilsCrossed',
		'nutrition-fitness'
	),
	combination(
		'combination-calm-trio',
		'Full Reset',
		'Complete Stretch, Breathing, and Meditation on the same day.',
		'Leaf',
		'stretch-breathing-meditation'
	),
	combination(
		'combination-screen-time-sleep',
		'Digital Sunset',
		'Complete Screen and Sleep on the same day.',
		'Power',
		'screen-time-sleep'
	),
	combination(
		'combination-balanced-day',
		'Balanced Day',
		'Complete Steps, Nutrition, Screen, and Sleep on the same day.',
		'Workflow',
		'steps-nutrition-screen-time-sleep'
	),
	combination(
		'combination-fitness-happiness',
		'Feel-Good Formula',
		'Complete Fitness with a happiness rating of four or higher.',
		'ScanHeart',
		'fitness-happiness-four'
	),
	combination(
		'combination-meditation-nutrition',
		'Mindful Meal',
		'Complete Meditation and Nutrition on the same day.',
		'Sprout',
		'meditation-nutrition'
	),
	combination(
		'combination-low-happiness-then-calm',
		'Take Care',
		'After a low check-in, complete Meditation or Breathing that day.',
		'CloudSunRain',
		'low-happiness-then-calm'
	),
	combination(
		'combination-fitness-then-sleep',
		'Recovery Mode',
		'Complete Fitness and pass Sleep the next day.',
		'BedSingle',
		'fitness-then-sleep'
	)
];

const rewardAndBackupAchievements: AchievementDefinition[] = [
	stateDefinition(
		'event-first-reward',
		'Reward Architect',
		'Create your first reward.',
		'Gift',
		'reward-count'
	),
	stateDefinition(
		'event-five-rewards',
		'Spoiled for Choice',
		'Create five rewards.',
		'PackageOpen',
		'reward-count',
		5
	),
	stateDefinition(
		'event-first-reward-redemption',
		'Treat Yourself',
		'Redeem your first reward.',
		'TicketCheck',
		'redemption-count'
	),
	eventDefinition(
		'event-first-backup',
		'Safe and Sound',
		'Complete your first successful backup.',
		'Save'
	)
];

export const achievementCatalog: readonly AchievementDefinition[] = [
	...trackerMilestones(),
	...overallAchievements,
	...trackerSpecialAchievements,
	...combinationAchievements,
	...rewardAndBackupAchievements
];

export const eventAchievementIds = rewardAndBackupAchievements
	.filter(({ metric }) => metric.type === 'event')
	.map(({ id }) => id);

export function isAchievementId(id: string) {
	return achievementCatalog.some((achievement) => achievement.id === id);
}

function trackerMilestones(): AchievementDefinition[] {
	return appTrackers.flatMap(({ id, label }) =>
		TRACKER_MILESTONE_TARGETS.map((target, index) => ({
			id: `${id}-${target}`,
			title: trackerCatalogDetails[id].titles[index],
			description: `Complete ${target} distinct ${target === 1 ? 'date' : 'dates'} with ${label.toLowerCase()}.`,
			icon: trackerCatalogDetails[id].icons[index],
			category: 'tracker-milestone',
			trackerId: id,
			target,
			metric: { type: 'tracker-completions', trackerId: id }
		}))
	);
}

function scoreAchievements(): AchievementDefinition[] {
	const tiers = [
		[100, 'Starting to Glow', 'Sparkle'],
		[500, 'Bright Spark', 'Zap'],
		[1_000, 'Radiant', 'Flame'],
		[2_500, 'Beacon', 'Crown'],
		[5_000, 'Supernova', 'Diamond']
	] as const;
	return tiers.map(([target, title, icon]) =>
		definition(
			`score-${target}`,
			title,
			`Earn ${target.toLocaleString('en-US')} total score.`,
			icon,
			'score',
			target,
			{ type: 'score' }
		)
	);
}

function streakAchievements(): AchievementDefinition[] {
	const tiers = [
		[3, 'Three’s a Habit', 'CalendarCheck'],
		[7, 'One Solid Week', 'CalendarRange'],
		[14, 'Two Weeks Strong', 'CalendarClock'],
		[30, 'Monthly Momentum', 'CalendarCheck2'],
		[100, 'Unstoppable', 'CalendarSync']
	] as const;
	return tiers.map(([target, title, icon]) =>
		definition(
			`streak-${target}`,
			title,
			`Reach a ${target}-day streak with any tracker.`,
			icon,
			'streak',
			target,
			{ type: 'best-streak' }
		)
	);
}

function trackerSpecial(
	id: string,
	title: string,
	description: string,
	icon: string,
	trackerId: AppTrackerId,
	target: number,
	key: TrackerSpecialMetric,
	value?: string
): AchievementDefinition {
	return {
		...definition(id, title, description, icon, 'tracker-special', target, {
			type: 'tracker-special',
			key,
			...(value ? { value } : {})
		}),
		trackerId
	};
}

function combination(
	id: string,
	title: string,
	description: string,
	icon: string,
	key: CombinationMetric
): AchievementDefinition {
	return definition(id, title, description, icon, 'combination', 1, {
		type: 'combination',
		key
	});
}

function stateDefinition(
	id: string,
	title: string,
	description: string,
	icon: string,
	key: StateAchievementMetric,
	target = 1
): AchievementDefinition {
	return definition(id, title, description, icon, 'event', target, { type: 'state', key });
}

function eventDefinition(
	id: string,
	title: string,
	description: string,
	icon: string,
	trackerId?: AppTrackerId
): AchievementDefinition {
	return {
		...definition(id, title, description, icon, 'event', 1, { type: 'event' }),
		...(trackerId ? { trackerId } : {})
	};
}

function definition(
	id: string,
	title: string,
	description: string,
	icon: string,
	category: AchievementCategory,
	target: number,
	metric: AchievementMetric
): AchievementDefinition {
	return { id, title, description, icon, category, target, metric };
}
