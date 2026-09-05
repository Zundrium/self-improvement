import type { ExercisePreference, WorkoutProgram } from './fitness/model';

const baseProgram = {
	id: 1,
	name: 'Total Body 30',
	description: 'A balanced 30-day program combining strength, core, cardio, mobility, and yoga.',
	durationDays: 30,
	workouts: [
		{
			id: 1,
			day: 1,
			title: 'Total Body - Day 1: Build',
			description:
				"Five-set total body routine inspired by Darebee's Total Body Day 1: reverse lunges, split lunges, side-to-side lunges, shoulder taps and plank leg raises. Perform 5 sets in total with 60 seconds rest between exercises and 30 seconds rest between sets.",
			imageUrl: '/fitness/workouts/day01.jpg',
			sets: 5,
			restBetweenExercises: 30,
			restBetweenSets: 60,
			activities: [
				{
					id: 1,
					exerciseId: 61,
					slug: 'reverse-lunges',
					name: 'Reverse Lunges',
					imageUrl: '/fitness/activities/reverse-lunges.webp',
					amount: 14,
					type: 'reps'
				},
				{
					id: 2,
					exerciseId: 92,
					slug: 'split-lunges',
					name: 'Split Lunges',
					imageUrl: '/fitness/activities/split-lunges.webp',
					amount: 14,
					type: 'reps'
				},
				{
					id: 3,
					exerciseId: 85,
					slug: 'side-to-side-lunges',
					name: 'Side-to-Side Lunges',
					imageUrl: '/fitness/activities/side-to-side-lunges.webp',
					amount: 14,
					type: 'reps'
				},
				{
					id: 4,
					exerciseId: 76,
					slug: 'shoulder-taps',
					name: 'Shoulder Taps',
					imageUrl: '/fitness/activities/shoulder-taps.webp',
					amount: 24,
					type: 'reps'
				},
				{
					id: 5,
					exerciseId: 46,
					slug: 'plank-leg-raises',
					name: 'Plank Leg Raises',
					imageUrl: '/fitness/activities/plank-leg-raises.webp',
					amount: 24,
					type: 'reps'
				}
			]
		},
		{
			id: 2,
			day: 2,
			title: 'Total Body - Day 2: Abs & Core',
			description:
				'Abs & Core workout. Level I: 3 sets, Level II: 5 sets, Level III: 7 sets. Rest up to 2 minutes between sets.',
			imageUrl: '/fitness/workouts/day02.jpg',
			sets: 3,
			restBetweenExercises: 30,
			restBetweenSets: 120,
			activities: [
				{
					id: 6,
					exerciseId: 29,
					slug: 'knee-in-twist',
					name: 'Knee-in Twist',
					imageUrl: '/fitness/activities/knee-in-twist.webp',
					amount: 10,
					type: 'reps'
				},
				{
					id: 7,
					exerciseId: 88,
					slug: 'sit-ups',
					name: 'Sit Ups',
					imageUrl: '/fitness/activities/sit-ups.webp',
					amount: 10,
					type: 'reps'
				},
				{
					id: 8,
					exerciseId: 59,
					slug: 'reverse-crunches',
					name: 'Reverse Crunches',
					imageUrl: '/fitness/activities/reverse-crunches.webp',
					amount: 10,
					type: 'reps'
				},
				{
					id: 9,
					exerciseId: 1,
					slug: 'back-extensions',
					name: 'Back Extensions',
					imageUrl: '/fitness/activities/back-extensions.webp',
					amount: 10,
					type: 'reps'
				}
			]
		},
		{
			id: 3,
			day: 3,
			title: 'Total Body - Day 3: Cardio Burn',
			description:
				'Cardio circuit alternating jumping jacks with toe tap hops, hops on the spot, and side-to-side hops.',
			imageUrl: '/fitness/workouts/day03.jpg',
			sets: 3,
			restBetweenExercises: 30,
			restBetweenSets: 120,
			activities: [
				{
					id: 10,
					exerciseId: 28,
					slug: 'jumping-jacks',
					name: 'Jumping Jacks',
					imageUrl: '/fitness/activities/jumping-jacks.webp',
					amount: 10,
					type: 'reps'
				},
				{
					id: 11,
					exerciseId: 101,
					slug: 'toe-tap-hops',
					name: 'Toe Tap Hops',
					imageUrl: '/fitness/activities/toe-tap-hops.webp',
					amount: 10,
					type: 'reps'
				},
				{
					id: 12,
					exerciseId: 28,
					slug: 'jumping-jacks',
					name: 'Jumping Jacks',
					imageUrl: '/fitness/activities/jumping-jacks.webp',
					amount: 10,
					type: 'reps'
				},
				{
					id: 13,
					exerciseId: 27,
					slug: 'hops-on-the-spot',
					name: 'Hops on the Spot',
					imageUrl: '/fitness/activities/hops-on-the-spot.webp',
					amount: 10,
					type: 'reps'
				},
				{
					id: 14,
					exerciseId: 28,
					slug: 'jumping-jacks',
					name: 'Jumping Jacks',
					imageUrl: '/fitness/activities/jumping-jacks.webp',
					amount: 10,
					type: 'reps'
				},
				{
					id: 15,
					exerciseId: 84,
					slug: 'side-to-side-hops',
					name: 'Side-to-Side Hops',
					imageUrl: '/fitness/activities/side-to-side-hops.webp',
					amount: 10,
					type: 'reps'
				}
			]
		},
		{
			id: 4,
			day: 4,
			title: 'Total Body - Day 4: Tendons',
			description:
				'Repeat or hold each exercise for 30 seconds, then move on to the next, Repeat the sequence again on the other side.',
			imageUrl: '/fitness/workouts/day04.jpg',
			sets: 1,
			restBetweenExercises: 30,
			restBetweenSets: 30,
			activities: [
				{
					id: 16,
					exerciseId: 36,
					slug: 'left-leg-side-swing',
					name: 'Left Leg Side Swing',
					imageUrl: '/fitness/activities/left-leg-side-swing.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 17,
					exerciseId: 66,
					slug: 'right-leg-side-swing',
					name: 'Right Leg Side Swing',
					imageUrl: '/fitness/activities/right-leg-side-swing.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 18,
					exerciseId: 94,
					slug: 'standing-straddle-stretch',
					name: 'Standing Straddle Stretch',
					imageUrl: '/fitness/activities/standing-straddle-stretch.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 19,
					exerciseId: 32,
					slug: 'left-leg-behind-swing',
					name: 'Left Leg Behind Swing',
					imageUrl: '/fitness/activities/left-leg-behind-swing.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 20,
					exerciseId: 62,
					slug: 'right-leg-behind-swing',
					name: 'Right Leg Behind Swing',
					imageUrl: '/fitness/activities/right-leg-behind-swing.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 21,
					exerciseId: 94,
					slug: 'standing-straddle-stretch',
					name: 'Standing Straddle Stretch',
					imageUrl: '/fitness/activities/standing-straddle-stretch.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 22,
					exerciseId: 34,
					slug: 'left-leg-forward-swing',
					name: 'Left Leg Forward Swing',
					imageUrl: '/fitness/activities/left-leg-forward-swing.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 23,
					exerciseId: 64,
					slug: 'right-leg-forward-swing',
					name: 'Right Leg Forward Swing',
					imageUrl: '/fitness/activities/right-leg-forward-swing.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 24,
					exerciseId: 94,
					slug: 'standing-straddle-stretch',
					name: 'Standing Straddle Stretch',
					imageUrl: '/fitness/activities/standing-straddle-stretch.webp',
					amount: 30,
					type: 'timed'
				}
			]
		},
		{
			id: 5,
			day: 5,
			title: 'Total Body - Day 5: Build',
			description:
				'Build your upper body strength with this 5-set routine. Perform 5 sets in total with 60 seconds rest between exercises and 30 seconds rest between sets.',
			imageUrl: '/fitness/workouts/day05.jpg',
			sets: 5,
			restBetweenExercises: 30,
			restBetweenSets: 60,
			activities: [
				{
					id: 25,
					exerciseId: 93,
					slug: 'squats',
					name: 'Squats',
					imageUrl: '/fitness/activities/squats.webp',
					amount: 14,
					type: 'reps'
				},
				{
					id: 26,
					exerciseId: 9,
					slug: 'calf-raises',
					name: 'Calf Raises',
					imageUrl: '/fitness/activities/calf-raises.webp',
					amount: 14,
					type: 'reps'
				},
				{
					id: 27,
					exerciseId: 47,
					slug: 'plank-rotations',
					name: 'Plank Rotations',
					imageUrl: '/fitness/activities/plank-rotations.webp',
					amount: 14,
					type: 'reps'
				},
				{
					id: 28,
					exerciseId: 45,
					slug: 'plank-arm-raises',
					name: 'Plank Arm Raises',
					imageUrl: '/fitness/activities/plank-arm-raises.webp',
					amount: 14,
					type: 'reps'
				},
				{
					id: 29,
					exerciseId: 98,
					slug: 'thigh-taps',
					name: 'Thigh Taps',
					imageUrl: '/fitness/activities/thigh-taps.webp',
					amount: 14,
					type: 'reps'
				}
			]
		},
		{
			id: 6,
			day: 6,
			title: 'Total Body - Day 6: Cardio HIIT',
			description: "Let's get your heart rate up!",
			imageUrl: '/fitness/workouts/day06.jpg',
			sets: 3,
			restBetweenExercises: 30,
			restBetweenSets: 30,
			activities: [
				{
					id: 30,
					exerciseId: 23,
					slug: 'high-knees',
					name: 'High Knees',
					imageUrl: '/fitness/activities/high-knees.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 31,
					exerciseId: 7,
					slug: 'butt-kicks',
					name: 'Butt Kicks',
					imageUrl: '/fitness/activities/butt-kicks.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 32,
					exerciseId: 23,
					slug: 'high-knees',
					name: 'High Knees',
					imageUrl: '/fitness/activities/high-knees.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 33,
					exerciseId: 40,
					slug: 'march-steps',
					name: 'March Steps',
					imageUrl: '/fitness/activities/march-steps.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 34,
					exerciseId: 23,
					slug: 'high-knees',
					name: 'High Knees',
					imageUrl: '/fitness/activities/high-knees.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 35,
					exerciseId: 91,
					slug: 'split-jacks',
					name: 'Split Jacks',
					imageUrl: '/fitness/activities/split-jacks.webp',
					amount: 30,
					type: 'timed'
				}
			]
		},
		{
			id: 7,
			day: 7,
			title: 'Total Body - Day 7: Yoga',
			description:
				'Hold each pose for 30 seconds then move on to the next one. Repeat the sequence again on the other side.',
			imageUrl: '/fitness/workouts/day07.jpg',
			sets: 1,
			restBetweenExercises: 10,
			restBetweenSets: 30,
			activities: [
				{
					id: 36,
					exerciseId: 16,
					slug: 'downward-facing-dog',
					name: 'Downward-Facing Dog',
					imageUrl: '/fitness/activities/downward-facing-dog.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 37,
					exerciseId: 15,
					slug: 'downward-dog-reach-back-right',
					name: 'Downward Dog Reach-Back Right',
					imageUrl: '/fitness/activities/downward-dog-reach-back-right.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 38,
					exerciseId: 14,
					slug: 'downward-dog-reach-back-left',
					name: 'Downward Dog Reach-Back Left',
					imageUrl: '/fitness/activities/downward-dog-reach-back-left.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 39,
					exerciseId: 83,
					slug: 'side-plank-right',
					name: 'Side Plank Right',
					imageUrl: '/fitness/activities/side-plank-right.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 40,
					exerciseId: 82,
					slug: 'side-plank-left',
					name: 'Side Plank Left',
					imageUrl: '/fitness/activities/side-plank-left.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 41,
					exerciseId: 100,
					slug: 'three-legged-downward-dog-right',
					name: 'Three-Legged Downward Dog Right',
					imageUrl: '/fitness/activities/three-legged-downward-dog-right.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 42,
					exerciseId: 99,
					slug: 'three-legged-downward-dog-left',
					name: 'Three-Legged Downward Dog Left',
					imageUrl: '/fitness/activities/three-legged-downward-dog-left.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 43,
					exerciseId: 25,
					slug: 'high-plank-hold-right',
					name: 'High Plank Hold Right',
					imageUrl: '/fitness/activities/high-plank-hold-right.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 44,
					exerciseId: 5,
					slug: 'bird-dog-right',
					name: 'Bird Dog Right',
					imageUrl: '/fitness/activities/bird-dog-right.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 45,
					exerciseId: 4,
					slug: 'bird-dog-left',
					name: 'Bird Dog Left',
					imageUrl: '/fitness/activities/bird-dog-left.webp',
					amount: 30,
					type: 'timed'
				}
			]
		},
		{
			id: 8,
			day: 8,
			title: 'Total Body - Day 8: Build',
			description:
				"Five-set total body routine inspired by Darebee's Total Body Day 8: split lunges, lunge step-ups, cossack squats, shoulder taps and up & down planks. Perform 5 sets in total with 60 seconds rest between exercises and 30 seconds rest between sets.",
			imageUrl: '/fitness/workouts/day08.jpg',
			sets: 5,
			restBetweenExercises: 60,
			restBetweenSets: 30,
			activities: [
				{
					id: 46,
					exerciseId: 92,
					slug: 'split-lunges',
					name: 'Split Lunges',
					imageUrl: '/fitness/activities/split-lunges.webp',
					amount: 14,
					type: 'reps'
				},
				{
					id: 47,
					exerciseId: 39,
					slug: 'lunge-step-ups',
					name: 'Lunge Step-Ups',
					imageUrl: '/fitness/activities/lunge-step-ups.webp',
					amount: 14,
					type: 'reps'
				},
				{
					id: 48,
					exerciseId: 11,
					slug: 'cossack-squats',
					name: 'Cossack Squats',
					imageUrl: '/fitness/activities/cossack-squats.webp',
					amount: 14,
					type: 'reps'
				},
				{
					id: 49,
					exerciseId: 76,
					slug: 'shoulder-taps',
					name: 'Shoulder Taps',
					imageUrl: '/fitness/activities/shoulder-taps.webp',
					amount: 24,
					type: 'reps'
				},
				{
					id: 50,
					exerciseId: 102,
					slug: 'up-down-planks',
					name: 'Up & Down Planks',
					imageUrl: '/fitness/activities/up-&-down-planks.webp',
					amount: 8,
					type: 'reps'
				}
			]
		},
		{
			id: 9,
			day: 9,
			title: 'Total Body - Day 9: Abs & Core',
			description:
				"Abs & core circuit inspired by Darebee's Total Body Day 9: flutter kicks, leg circles, dead bug and back extensions. Perform 5 sets (Level III) with no rest between exercises and 2 minutes rest between sets.",
			imageUrl: '/fitness/workouts/day09.jpg',
			sets: 5,
			restBetweenExercises: 0,
			restBetweenSets: 120,
			activities: [
				{
					id: 51,
					exerciseId: 18,
					slug: 'flutter-kicks',
					name: 'Flutter Kicks',
					imageUrl: '/fitness/activities/flutter-kicks.webp',
					amount: 10,
					type: 'reps'
				},
				{
					id: 52,
					exerciseId: 37,
					slug: 'leg-circles',
					name: 'Leg Circles',
					imageUrl: '/fitness/activities/leg-circles.webp',
					amount: 10,
					type: 'reps'
				},
				{
					id: 53,
					exerciseId: 13,
					slug: 'dead-bug',
					name: 'Dead Bug',
					imageUrl: '/fitness/activities/dead-bug.webp',
					amount: 10,
					type: 'reps'
				},
				{
					id: 54,
					exerciseId: 1,
					slug: 'back-extensions',
					name: 'Back Extensions',
					imageUrl: '/fitness/activities/back-extensions.webp',
					amount: 10,
					type: 'reps'
				}
			]
		},
		{
			id: 10,
			day: 10,
			title: 'Total Body - Day 10: Cardio Burn',
			description:
				'Cardio burn circuit: jumping jacks, knee-to-elbow, jumping jacks, hops on the spot, seal jacks and side-to-side hops. Perform 7 sets (Level III) with 2 minutes rest between sets.',
			imageUrl: '/fitness/workouts/day10.jpg',
			sets: 7,
			restBetweenExercises: 0,
			restBetweenSets: 120,
			activities: [
				{
					id: 55,
					exerciseId: 28,
					slug: 'jumping-jacks',
					name: 'Jumping Jacks',
					imageUrl: '/fitness/activities/jumping-jacks.webp',
					amount: 10,
					type: 'reps'
				},
				{
					id: 56,
					exerciseId: 30,
					slug: 'knee-to-elbow',
					name: 'Knee-to-Elbow',
					imageUrl: '/fitness/activities/knee-to-elbow.webp',
					amount: 10,
					type: 'reps'
				},
				{
					id: 57,
					exerciseId: 28,
					slug: 'jumping-jacks',
					name: 'Jumping Jacks',
					imageUrl: '/fitness/activities/jumping-jacks.webp',
					amount: 10,
					type: 'reps'
				},
				{
					id: 58,
					exerciseId: 27,
					slug: 'hops-on-the-spot',
					name: 'Hops on the Spot',
					imageUrl: '/fitness/activities/hops-on-the-spot.webp',
					amount: 10,
					type: 'reps'
				},
				{
					id: 59,
					exerciseId: 68,
					slug: 'seal-jacks',
					name: 'Seal Jacks',
					imageUrl: '/fitness/activities/seal-jacks.webp',
					amount: 10,
					type: 'reps'
				},
				{
					id: 60,
					exerciseId: 84,
					slug: 'side-to-side-hops',
					name: 'Side-to-Side Hops',
					imageUrl: '/fitness/activities/side-to-side-hops.webp',
					amount: 10,
					type: 'reps'
				}
			]
		},
		{
			id: 11,
			day: 11,
			title: 'Total Body - Day 11: Tendons',
			description:
				'Repeat or hold each exercise for 30 seconds, then move on to the next. Repeat the sequence again on the other side.',
			imageUrl: '/fitness/workouts/day11.jpg',
			sets: 1,
			restBetweenExercises: 30,
			restBetweenSets: 30,
			activities: [
				{
					id: 61,
					exerciseId: 81,
					slug: 'side-lying-straight-leg-raise-right',
					name: 'Side-Lying Straight-Leg Raise Right',
					imageUrl: '/fitness/activities/side-lying-straight-leg-raise-right.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 62,
					exerciseId: 79,
					slug: 'side-lying-straight-leg-hold-right',
					name: 'Side-Lying Straight-Leg Hold Right',
					imageUrl: '/fitness/activities/side-lying-straight-leg-hold-right.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 63,
					exerciseId: 81,
					slug: 'side-lying-straight-leg-raise-right',
					name: 'Side-Lying Straight-Leg Raise Right',
					imageUrl: '/fitness/activities/side-lying-straight-leg-raise-right.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 64,
					exerciseId: 75,
					slug: 'seated-straight-leg-swing-right',
					name: 'Seated Straight-Leg Swing Right',
					imageUrl: '/fitness/activities/seated-straight-leg-swing-right.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 65,
					exerciseId: 73,
					slug: 'seated-straight-leg-hold-right',
					name: 'Seated Straight-Leg Hold Right',
					imageUrl: '/fitness/activities/seated-straight-leg-hold-right.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 66,
					exerciseId: 75,
					slug: 'seated-straight-leg-swing-right',
					name: 'Seated Straight-Leg Swing Right',
					imageUrl: '/fitness/activities/seated-straight-leg-swing-right.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 67,
					exerciseId: 80,
					slug: 'side-lying-straight-leg-raise-left',
					name: 'Side-Lying Straight-Leg Raise Left',
					imageUrl: '/fitness/activities/side-lying-straight-leg-raise-left.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 68,
					exerciseId: 78,
					slug: 'side-lying-straight-leg-hold-left',
					name: 'Side-Lying Straight-Leg Hold Left',
					imageUrl: '/fitness/activities/side-lying-straight-leg-hold-left.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 69,
					exerciseId: 80,
					slug: 'side-lying-straight-leg-raise-left',
					name: 'Side-Lying Straight-Leg Raise Left',
					imageUrl: '/fitness/activities/side-lying-straight-leg-raise-left.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 70,
					exerciseId: 74,
					slug: 'seated-straight-leg-swing-left',
					name: 'Seated Straight-Leg Swing Left',
					imageUrl: '/fitness/activities/seated-straight-leg-swing-left.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 71,
					exerciseId: 72,
					slug: 'seated-straight-leg-hold-left',
					name: 'Seated Straight-Leg Hold Left',
					imageUrl: '/fitness/activities/seated-straight-leg-hold-left.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 72,
					exerciseId: 74,
					slug: 'seated-straight-leg-swing-left',
					name: 'Seated Straight-Leg Swing Left',
					imageUrl: '/fitness/activities/seated-straight-leg-swing-left.webp',
					amount: 30,
					type: 'timed'
				}
			]
		},
		{
			id: 12,
			day: 12,
			title: 'Total Body - Day 12: Build',
			description:
				'Five-set total body routine: bridges, get-ups, reverse angels, prone reverse fly and W-extensions. Perform 5 sets in total with 60 seconds rest between exercises and 30 seconds rest between sets.',
			imageUrl: '/fitness/workouts/day12.jpg',
			sets: 5,
			restBetweenExercises: 60,
			restBetweenSets: 30,
			activities: [
				{
					id: 73,
					exerciseId: 6,
					slug: 'bridges',
					name: 'Bridges',
					imageUrl: '/fitness/activities/bridges.webp',
					amount: 24,
					type: 'reps'
				},
				{
					id: 74,
					exerciseId: 20,
					slug: 'get-ups',
					name: 'Get-Ups',
					imageUrl: '/fitness/activities/get-ups.webp',
					amount: 24,
					type: 'reps'
				},
				{
					id: 75,
					exerciseId: 58,
					slug: 'reverse-angels',
					name: 'Reverse Angels',
					imageUrl: '/fitness/activities/reverse-angels.webp',
					amount: 14,
					type: 'reps'
				},
				{
					id: 76,
					exerciseId: 48,
					slug: 'prone-reverse-fly',
					name: 'Prone Reverse Fly',
					imageUrl: '/fitness/activities/prone-reverse-fly.webp',
					amount: 14,
					type: 'reps'
				},
				{
					id: 77,
					exerciseId: 104,
					slug: 'w-extensions',
					name: 'W-Extensions',
					imageUrl: '/fitness/activities/w-extensions.webp',
					amount: 14,
					type: 'reps'
				}
			]
		},
		{
			id: 13,
			day: 13,
			title: 'Total Body - Day 13: Cardio HIIT',
			description:
				'30-second intervals: split jacks, high knees, split jacks, butt kicks, split jacks and butt kicks. Perform 7 sets (Level III) with 2 minutes rest between sets.',
			imageUrl: '/fitness/workouts/day13.jpg',
			sets: 7,
			restBetweenExercises: 0,
			restBetweenSets: 120,
			activities: [
				{
					id: 78,
					exerciseId: 91,
					slug: 'split-jacks',
					name: 'Split Jacks',
					imageUrl: '/fitness/activities/split-jacks.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 79,
					exerciseId: 23,
					slug: 'high-knees',
					name: 'High Knees',
					imageUrl: '/fitness/activities/high-knees.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 80,
					exerciseId: 91,
					slug: 'split-jacks',
					name: 'Split Jacks',
					imageUrl: '/fitness/activities/split-jacks.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 81,
					exerciseId: 7,
					slug: 'butt-kicks',
					name: 'Butt Kicks',
					imageUrl: '/fitness/activities/butt-kicks.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 82,
					exerciseId: 91,
					slug: 'split-jacks',
					name: 'Split Jacks',
					imageUrl: '/fitness/activities/split-jacks.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 83,
					exerciseId: 7,
					slug: 'butt-kicks',
					name: 'Butt Kicks',
					imageUrl: '/fitness/activities/butt-kicks.webp',
					amount: 30,
					type: 'timed'
				}
			]
		},
		{
			id: 14,
			day: 14,
			title: 'Total Body - Day 14: Yoga',
			description:
				'Hold each pose for 30 seconds then move on to the next one. Repeat the sequence again on the other side.',
			imageUrl: '/fitness/workouts/day14.jpg',
			sets: 1,
			restBetweenExercises: 10,
			restBetweenSets: 30,
			activities: [
				{
					id: 84,
					exerciseId: 17,
					slug: 'extended-mountain-reach',
					name: 'Extended Mountain Reach',
					imageUrl: '/fitness/activities/extended-mountain-reach.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 85,
					exerciseId: 10,
					slug: 'chair-pose',
					name: 'Chair Pose',
					imageUrl: '/fitness/activities/chair-pose.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 86,
					exerciseId: 17,
					slug: 'extended-mountain-reach',
					name: 'Extended Mountain Reach',
					imageUrl: '/fitness/activities/extended-mountain-reach.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 87,
					exerciseId: 87,
					slug: 'single-leg-knee-lift-balance-right',
					name: 'Single-Leg Knee-Lift Balance Right',
					imageUrl: '/fitness/activities/single-leg-knee-lift-balance-right.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 88,
					exerciseId: 106,
					slug: 'warrior-3-right',
					name: 'Warrior 3 Right',
					imageUrl: '/fitness/activities/warrior-3-right.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 89,
					exerciseId: 87,
					slug: 'single-leg-knee-lift-balance-right',
					name: 'Single-Leg Knee-Lift Balance Right',
					imageUrl: '/fitness/activities/single-leg-knee-lift-balance-right.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 90,
					exerciseId: 86,
					slug: 'single-leg-knee-lift-balance-left',
					name: 'Single-Leg Knee-Lift Balance Left',
					imageUrl: '/fitness/activities/single-leg-knee-lift-balance-left.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 91,
					exerciseId: 105,
					slug: 'warrior-3-left',
					name: 'Warrior 3 Left',
					imageUrl: '/fitness/activities/warrior-3-left.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 92,
					exerciseId: 86,
					slug: 'single-leg-knee-lift-balance-left',
					name: 'Single-Leg Knee-Lift Balance Left',
					imageUrl: '/fitness/activities/single-leg-knee-lift-balance-left.webp',
					amount: 30,
					type: 'timed'
				}
			]
		},
		{
			id: 15,
			day: 15,
			title: 'Total Body - Day 15: Build',
			description:
				'Five-set total body routine: reverse lunges, side-to-side lunges, forward lunges, shoulder taps and plank rotations. Perform 5 sets in total with 60 seconds rest between exercises and 30 seconds rest between sets.',
			imageUrl: '/fitness/workouts/day15.jpg',
			sets: 5,
			restBetweenExercises: 60,
			restBetweenSets: 30,
			activities: [
				{
					id: 93,
					exerciseId: 61,
					slug: 'reverse-lunges',
					name: 'Reverse Lunges',
					imageUrl: '/fitness/activities/reverse-lunges.webp',
					amount: 16,
					type: 'reps'
				},
				{
					id: 94,
					exerciseId: 85,
					slug: 'side-to-side-lunges',
					name: 'Side-to-Side Lunges',
					imageUrl: '/fitness/activities/side-to-side-lunges.webp',
					amount: 16,
					type: 'reps'
				},
				{
					id: 95,
					exerciseId: 19,
					slug: 'forward-lunges',
					name: 'Forward Lunges',
					imageUrl: '/fitness/activities/forward-lunges.webp',
					amount: 16,
					type: 'reps'
				},
				{
					id: 96,
					exerciseId: 76,
					slug: 'shoulder-taps',
					name: 'Shoulder Taps',
					imageUrl: '/fitness/activities/shoulder-taps.webp',
					amount: 24,
					type: 'reps'
				},
				{
					id: 97,
					exerciseId: 47,
					slug: 'plank-rotations',
					name: 'Plank Rotations',
					imageUrl: '/fitness/activities/plank-rotations.webp',
					amount: 24,
					type: 'reps'
				}
			]
		},
		{
			id: 16,
			day: 16,
			title: 'Total Body - Day 16: Abs & Core',
			description:
				'Abs & core circuit: high crunches, sitting twists, crunch kicks and leg raises. Perform 5 sets (Level III) with 2 minutes rest between sets.',
			imageUrl: '/fitness/workouts/day16.jpg',
			sets: 5,
			restBetweenExercises: 10,
			restBetweenSets: 120,
			activities: [
				{
					id: 98,
					exerciseId: 22,
					slug: 'high-crunches',
					name: 'High Crunches',
					imageUrl: '/fitness/activities/high-crunches.webp',
					amount: 12,
					type: 'reps'
				},
				{
					id: 99,
					exerciseId: 89,
					slug: 'sitting-twists',
					name: 'Sitting Twists',
					imageUrl: '/fitness/activities/sitting-twists.webp',
					amount: 12,
					type: 'reps'
				},
				{
					id: 100,
					exerciseId: 12,
					slug: 'crunch-kicks',
					name: 'Crunch Kicks',
					imageUrl: '/fitness/activities/crunch-kicks.webp',
					amount: 12,
					type: 'reps'
				},
				{
					id: 101,
					exerciseId: 38,
					slug: 'leg-raises',
					name: 'Leg Raises',
					imageUrl: '/fitness/activities/leg-raises.webp',
					amount: 12,
					type: 'reps'
				}
			]
		},
		{
			id: 17,
			day: 17,
			title: 'Total Body - Day 17: Cardio Burn',
			description:
				'Cardio burn circuit: toe tap hops, jumping jacks, toe tap hops, jumping jacks, hops on the spot and jumping jacks. Perform 7 sets (Level III) with 2 minutes rest between sets.',
			imageUrl: '/fitness/workouts/day17.jpg',
			sets: 7,
			restBetweenExercises: 0,
			restBetweenSets: 120,
			activities: [
				{
					id: 102,
					exerciseId: 101,
					slug: 'toe-tap-hops',
					name: 'Toe Tap Hops',
					imageUrl: '/fitness/activities/toe-tap-hops.webp',
					amount: 12,
					type: 'reps'
				},
				{
					id: 103,
					exerciseId: 28,
					slug: 'jumping-jacks',
					name: 'Jumping Jacks',
					imageUrl: '/fitness/activities/jumping-jacks.webp',
					amount: 12,
					type: 'reps'
				},
				{
					id: 104,
					exerciseId: 101,
					slug: 'toe-tap-hops',
					name: 'Toe Tap Hops',
					imageUrl: '/fitness/activities/toe-tap-hops.webp',
					amount: 12,
					type: 'reps'
				},
				{
					id: 105,
					exerciseId: 28,
					slug: 'jumping-jacks',
					name: 'Jumping Jacks',
					imageUrl: '/fitness/activities/jumping-jacks.webp',
					amount: 12,
					type: 'reps'
				},
				{
					id: 106,
					exerciseId: 27,
					slug: 'hops-on-the-spot',
					name: 'Hops on the Spot',
					imageUrl: '/fitness/activities/hops-on-the-spot.webp',
					amount: 12,
					type: 'reps'
				},
				{
					id: 107,
					exerciseId: 28,
					slug: 'jumping-jacks',
					name: 'Jumping Jacks',
					imageUrl: '/fitness/activities/jumping-jacks.webp',
					amount: 12,
					type: 'reps'
				}
			]
		},
		{
			id: 18,
			day: 18,
			title: 'Total Body - Day 18: Tendons',
			description:
				'Repeat or hold each exercise for 30 seconds then move on to the next. Repeat the sequence again on the other side.',
			imageUrl: '/fitness/workouts/day18.jpg',
			sets: 1,
			restBetweenExercises: 30,
			restBetweenSets: 30,
			activities: [
				{
					id: 108,
					exerciseId: 32,
					slug: 'left-leg-behind-swing',
					name: 'Left Leg Behind Swing',
					imageUrl: '/fitness/activities/left-leg-behind-swing.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 109,
					exerciseId: 34,
					slug: 'left-leg-forward-swing',
					name: 'Left Leg Forward Swing',
					imageUrl: '/fitness/activities/left-leg-forward-swing.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 110,
					exerciseId: 33,
					slug: 'left-leg-forward-raise-hold',
					name: 'Left Leg Forward Raise Hold',
					imageUrl: '/fitness/activities/left-leg-forward-raise-hold.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 111,
					exerciseId: 36,
					slug: 'left-leg-side-swing',
					name: 'Left Leg Side Swing',
					imageUrl: '/fitness/activities/left-leg-side-swing.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 112,
					exerciseId: 35,
					slug: 'left-leg-side-raise-hold',
					name: 'Left Leg Side Raise Hold',
					imageUrl: '/fitness/activities/left-leg-side-raise-hold.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 113,
					exerciseId: 94,
					slug: 'standing-straddle-stretch',
					name: 'Standing Straddle Stretch',
					imageUrl: '/fitness/activities/standing-straddle-stretch.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 114,
					exerciseId: 62,
					slug: 'right-leg-behind-swing',
					name: 'Right Leg Behind Swing',
					imageUrl: '/fitness/activities/right-leg-behind-swing.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 115,
					exerciseId: 64,
					slug: 'right-leg-forward-swing',
					name: 'Right Leg Forward Swing',
					imageUrl: '/fitness/activities/right-leg-forward-swing.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 116,
					exerciseId: 63,
					slug: 'right-leg-forward-raise-hold',
					name: 'Right Leg Forward Raise Hold',
					imageUrl: '/fitness/activities/right-leg-forward-raise-hold.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 117,
					exerciseId: 66,
					slug: 'right-leg-side-swing',
					name: 'Right Leg Side Swing',
					imageUrl: '/fitness/activities/right-leg-side-swing.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 118,
					exerciseId: 65,
					slug: 'right-leg-side-raise-hold',
					name: 'Right Leg Side Raise Hold',
					imageUrl: '/fitness/activities/right-leg-side-raise-hold.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 119,
					exerciseId: 94,
					slug: 'standing-straddle-stretch',
					name: 'Standing Straddle Stretch',
					imageUrl: '/fitness/activities/standing-straddle-stretch.webp',
					amount: 30,
					type: 'timed'
				}
			]
		},
		{
			id: 19,
			day: 19,
			title: 'Total Body - Day 19: Build',
			description:
				'Five-set total body routine: squats, calf raises, shoulder taps, plank arm raises and thigh taps. Perform 5 sets in total with 60 seconds rest between exercises and 30 seconds rest between sets.',
			imageUrl: '/fitness/workouts/day19.jpg',
			sets: 5,
			restBetweenExercises: 60,
			restBetweenSets: 30,
			activities: [
				{
					id: 120,
					exerciseId: 93,
					slug: 'squats',
					name: 'Squats',
					imageUrl: '/fitness/activities/squats.webp',
					amount: 16,
					type: 'reps'
				},
				{
					id: 121,
					exerciseId: 9,
					slug: 'calf-raises',
					name: 'Calf Raises',
					imageUrl: '/fitness/activities/calf-raises.webp',
					amount: 16,
					type: 'reps'
				},
				{
					id: 122,
					exerciseId: 76,
					slug: 'shoulder-taps',
					name: 'Shoulder Taps',
					imageUrl: '/fitness/activities/shoulder-taps.webp',
					amount: 28,
					type: 'reps'
				},
				{
					id: 123,
					exerciseId: 45,
					slug: 'plank-arm-raises',
					name: 'Plank Arm Raises',
					imageUrl: '/fitness/activities/plank-arm-raises.webp',
					amount: 16,
					type: 'reps'
				},
				{
					id: 124,
					exerciseId: 98,
					slug: 'thigh-taps',
					name: 'Thigh Taps',
					imageUrl: '/fitness/activities/thigh-taps.webp',
					amount: 16,
					type: 'reps'
				}
			]
		},
		{
			id: 20,
			day: 20,
			title: 'Total Body - Day 20: Cardio HIIT',
			description:
				'30-second intervals: high knees, straight leg bounds, high knees, butt kicks, high knees and butt kicks. Perform 7 sets (Level III) with 2 minutes rest between sets.',
			imageUrl: '/fitness/workouts/day20.jpg',
			sets: 7,
			restBetweenExercises: 0,
			restBetweenSets: 120,
			activities: [
				{
					id: 125,
					exerciseId: 23,
					slug: 'high-knees',
					name: 'High Knees',
					imageUrl: '/fitness/activities/high-knees.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 126,
					exerciseId: 95,
					slug: 'straight-leg-bounds',
					name: 'Straight Leg Bounds',
					imageUrl: '/fitness/activities/straight-leg-bounds.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 127,
					exerciseId: 23,
					slug: 'high-knees',
					name: 'High Knees',
					imageUrl: '/fitness/activities/high-knees.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 128,
					exerciseId: 7,
					slug: 'butt-kicks',
					name: 'Butt Kicks',
					imageUrl: '/fitness/activities/butt-kicks.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 129,
					exerciseId: 23,
					slug: 'high-knees',
					name: 'High Knees',
					imageUrl: '/fitness/activities/high-knees.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 130,
					exerciseId: 7,
					slug: 'butt-kicks',
					name: 'Butt Kicks',
					imageUrl: '/fitness/activities/butt-kicks.webp',
					amount: 30,
					type: 'timed'
				}
			]
		},
		{
			id: 21,
			day: 21,
			title: 'Total Body - Day 21: Yoga',
			description:
				'Hold each pose for 30 seconds then move on to the next one. Repeat the sequence again on the other side.',
			imageUrl: '/fitness/workouts/day21.jpg',
			sets: 1,
			restBetweenExercises: 10,
			restBetweenSets: 30,
			activities: [
				{
					id: 131,
					exerciseId: 71,
					slug: 'seated-overhead-reach',
					name: 'Seated Overhead Reach',
					imageUrl: '/fitness/activities/seated-overhead-reach.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 132,
					exerciseId: 42,
					slug: 'overhead-triceps-stretch-right',
					name: 'Overhead Triceps Stretch Right',
					imageUrl: '/fitness/activities/overhead-triceps-stretch-right.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 133,
					exerciseId: 41,
					slug: 'overhead-triceps-stretch-left',
					name: 'Overhead Triceps Stretch Left',
					imageUrl: '/fitness/activities/overhead-triceps-stretch-left.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 134,
					exerciseId: 2,
					slug: 'back-triceps-stretch-left',
					name: 'Back Triceps Stretch Left',
					imageUrl: '/fitness/activities/back-triceps-stretch-left.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 135,
					exerciseId: 3,
					slug: 'back-triceps-stretch-right',
					name: 'Back Triceps Stretch Right',
					imageUrl: '/fitness/activities/back-triceps-stretch-right.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 136,
					exerciseId: 8,
					slug: 'butterfly-pose',
					name: 'Butterfly Pose',
					imageUrl: '/fitness/activities/butterfly-pose.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 137,
					exerciseId: 70,
					slug: 'seated-forward-fold-right',
					name: 'Seated Forward Fold Right',
					imageUrl: '/fitness/activities/seated-forward-fold-right.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 138,
					exerciseId: 69,
					slug: 'seated-forward-fold-left',
					name: 'Seated Forward Fold Left',
					imageUrl: '/fitness/activities/seated-forward-fold-left.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 139,
					exerciseId: 44,
					slug: 'pigeon-pose-right',
					name: 'Pigeon Pose Right',
					imageUrl: '/fitness/activities/pigeon-pose-right.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 140,
					exerciseId: 43,
					slug: 'pigeon-pose-left',
					name: 'Pigeon Pose Left',
					imageUrl: '/fitness/activities/pigeon-pose-left.webp',
					amount: 30,
					type: 'timed'
				}
			]
		},
		{
			id: 22,
			day: 22,
			title: 'Total Body - Day 22: Build',
			description:
				'Five-set total body routine: cossack squats, reverse deep lunges, shoulder taps and slow climber taps. Perform 5 sets in total with 60 seconds rest between exercises and 30 seconds rest between sets.',
			imageUrl: '/fitness/workouts/day22.jpg',
			sets: 5,
			restBetweenExercises: 60,
			restBetweenSets: 30,
			activities: [
				{
					id: 141,
					exerciseId: 11,
					slug: 'cossack-squats',
					name: 'Cossack Squats',
					imageUrl: '/fitness/activities/cossack-squats.webp',
					amount: 28,
					type: 'reps'
				},
				{
					id: 142,
					exerciseId: 60,
					slug: 'reverse-deep-lunges',
					name: 'Reverse Deep Lunges',
					imageUrl: '/fitness/activities/reverse-deep-lunges.webp',
					amount: 28,
					type: 'reps'
				},
				{
					id: 143,
					exerciseId: 76,
					slug: 'shoulder-taps',
					name: 'Shoulder Taps',
					imageUrl: '/fitness/activities/shoulder-taps.webp',
					amount: 28,
					type: 'reps'
				},
				{
					id: 144,
					exerciseId: 90,
					slug: 'slow-climber-taps',
					name: 'Slow Climber Taps',
					imageUrl: '/fitness/activities/slow-climber-taps.webp',
					amount: 28,
					type: 'reps'
				}
			]
		},
		{
			id: 23,
			day: 23,
			title: 'Total Body - Day 23: Abs & Core',
			description:
				'Abs & core circuit: knee-to-elbow, heel taps, scissors and windshield wipers. Perform 5 sets (Level III) with 2 minutes rest between sets.',
			imageUrl: '/fitness/workouts/day23.jpg',
			sets: 5,
			restBetweenExercises: 0,
			restBetweenSets: 120,
			activities: [
				{
					id: 145,
					exerciseId: 30,
					slug: 'knee-to-elbow',
					name: 'Knee-to-Elbow',
					imageUrl: '/fitness/activities/knee-to-elbow.webp',
					amount: 12,
					type: 'reps'
				},
				{
					id: 146,
					exerciseId: 21,
					slug: 'heel-taps',
					name: 'Heel Taps',
					imageUrl: '/fitness/activities/heel-taps.webp',
					amount: 12,
					type: 'reps'
				},
				{
					id: 147,
					exerciseId: 67,
					slug: 'scissors',
					name: 'Scissors',
					imageUrl: '/fitness/activities/scissors.webp',
					amount: 12,
					type: 'reps'
				},
				{
					id: 148,
					exerciseId: 107,
					slug: 'windshield-wipers',
					name: 'Windshield Wipers',
					imageUrl: '/fitness/activities/windshield-wipers.webp',
					amount: 12,
					type: 'reps'
				}
			]
		},
		{
			id: 24,
			day: 24,
			title: 'Total Body - Day 24: Cardio Burn',
			description:
				'Cardio burn circuit: jumping jacks, knee-to-elbow, jumping jacks, seal jacks, jumping jacks and seal jacks. Perform 7 sets (Level III) with 2 minutes rest between sets.',
			imageUrl: '/fitness/workouts/day24.jpg',
			sets: 7,
			restBetweenExercises: 0,
			restBetweenSets: 120,
			activities: [
				{
					id: 149,
					exerciseId: 28,
					slug: 'jumping-jacks',
					name: 'Jumping Jacks',
					imageUrl: '/fitness/activities/jumping-jacks.webp',
					amount: 14,
					type: 'reps'
				},
				{
					id: 150,
					exerciseId: 30,
					slug: 'knee-to-elbow',
					name: 'Knee-to-Elbow',
					imageUrl: '/fitness/activities/knee-to-elbow.webp',
					amount: 14,
					type: 'reps'
				},
				{
					id: 151,
					exerciseId: 28,
					slug: 'jumping-jacks',
					name: 'Jumping Jacks',
					imageUrl: '/fitness/activities/jumping-jacks.webp',
					amount: 14,
					type: 'reps'
				},
				{
					id: 152,
					exerciseId: 68,
					slug: 'seal-jacks',
					name: 'Seal Jacks',
					imageUrl: '/fitness/activities/seal-jacks.webp',
					amount: 14,
					type: 'reps'
				},
				{
					id: 153,
					exerciseId: 28,
					slug: 'jumping-jacks',
					name: 'Jumping Jacks',
					imageUrl: '/fitness/activities/jumping-jacks.webp',
					amount: 14,
					type: 'reps'
				},
				{
					id: 154,
					exerciseId: 68,
					slug: 'seal-jacks',
					name: 'Seal Jacks',
					imageUrl: '/fitness/activities/seal-jacks.webp',
					amount: 14,
					type: 'reps'
				}
			]
		},
		{
			id: 25,
			day: 25,
			title: 'Total Body - Day 25: Tendons',
			description:
				'Repeat or hold each exercise for 30 seconds then move on to the next one. Repeat the sequence again on the other side.',
			imageUrl: '/fitness/workouts/day25.jpg',
			sets: 1,
			restBetweenExercises: 30,
			restBetweenSets: 30,
			activities: [
				{
					id: 155,
					exerciseId: 54,
					slug: 'quadruped-straight-leg-raises-right',
					name: 'Quadruped Straight-Leg Raises Right',
					imageUrl: '/fitness/activities/quadruped-straight-leg-raises-right.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 156,
					exerciseId: 53,
					slug: 'quadruped-straight-leg-raises-left',
					name: 'Quadruped Straight-Leg Raises Left',
					imageUrl: '/fitness/activities/quadruped-straight-leg-raises-left.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 157,
					exerciseId: 52,
					slug: 'quadruped-straight-leg-raise-hold-right',
					name: 'Quadruped Straight-Leg Raise Hold Right',
					imageUrl: '/fitness/activities/quadruped-straight-leg-raise-hold-right.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 158,
					exerciseId: 51,
					slug: 'quadruped-straight-leg-raise-hold-left',
					name: 'Quadruped Straight-Leg Raise Hold Left',
					imageUrl: '/fitness/activities/quadruped-straight-leg-raise-hold-left.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 159,
					exerciseId: 54,
					slug: 'quadruped-straight-leg-raises-right',
					name: 'Quadruped Straight-Leg Raises Right',
					imageUrl: '/fitness/activities/quadruped-straight-leg-raises-right.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 160,
					exerciseId: 53,
					slug: 'quadruped-straight-leg-raises-left',
					name: 'Quadruped Straight-Leg Raises Left',
					imageUrl: '/fitness/activities/quadruped-straight-leg-raises-left.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 161,
					exerciseId: 50,
					slug: 'quadruped-donkey-kicks-right',
					name: 'Quadruped Donkey Kicks Right',
					imageUrl: '/fitness/activities/quadruped-donkey-kicks-right.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 162,
					exerciseId: 49,
					slug: 'quadruped-donkey-kicks-left',
					name: 'Quadruped Donkey Kicks Left',
					imageUrl: '/fitness/activities/quadruped-donkey-kicks-left.webp',
					amount: 30,
					type: 'timed'
				}
			]
		},
		{
			id: 26,
			day: 26,
			title: 'Total Body - Day 26: Build',
			description:
				'Five-set total body routine: bridges, side bridges, reverse angels, prone reverse fly and W-extensions. Perform 5 sets in total with 60 seconds rest between exercises and 30 seconds rest between sets.',
			imageUrl: '/fitness/workouts/day26.jpg',
			sets: 5,
			restBetweenExercises: 60,
			restBetweenSets: 30,
			activities: [
				{
					id: 163,
					exerciseId: 6,
					slug: 'bridges',
					name: 'Bridges',
					imageUrl: '/fitness/activities/bridges.webp',
					amount: 28,
					type: 'reps'
				},
				{
					id: 164,
					exerciseId: 77,
					slug: 'side-bridges',
					name: 'Side Bridges',
					imageUrl: '/fitness/activities/side-bridges.webp',
					amount: 28,
					type: 'reps'
				},
				{
					id: 165,
					exerciseId: 58,
					slug: 'reverse-angels',
					name: 'Reverse Angels',
					imageUrl: '/fitness/activities/reverse-angels.webp',
					amount: 16,
					type: 'reps'
				},
				{
					id: 166,
					exerciseId: 48,
					slug: 'prone-reverse-fly',
					name: 'Prone Reverse Fly',
					imageUrl: '/fitness/activities/prone-reverse-fly.webp',
					amount: 16,
					type: 'reps'
				},
				{
					id: 167,
					exerciseId: 104,
					slug: 'w-extensions',
					name: 'W-Extensions',
					imageUrl: '/fitness/activities/w-extensions.webp',
					amount: 16,
					type: 'reps'
				}
			]
		},
		{
			id: 27,
			day: 27,
			title: 'Total Body - Day 27: Cardio HIIT',
			description:
				'30-second intervals: high knees, butt kicks, high knees, split jacks, straight leg bounds and split jacks. Perform 7 sets (Level III) with 2 minutes rest between sets.',
			imageUrl: '/fitness/workouts/day27.jpg',
			sets: 7,
			restBetweenExercises: 0,
			restBetweenSets: 120,
			activities: [
				{
					id: 168,
					exerciseId: 23,
					slug: 'high-knees',
					name: 'High Knees',
					imageUrl: '/fitness/activities/high-knees.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 169,
					exerciseId: 7,
					slug: 'butt-kicks',
					name: 'Butt Kicks',
					imageUrl: '/fitness/activities/butt-kicks.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 170,
					exerciseId: 23,
					slug: 'high-knees',
					name: 'High Knees',
					imageUrl: '/fitness/activities/high-knees.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 171,
					exerciseId: 91,
					slug: 'split-jacks',
					name: 'Split Jacks',
					imageUrl: '/fitness/activities/split-jacks.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 172,
					exerciseId: 95,
					slug: 'straight-leg-bounds',
					name: 'Straight Leg Bounds',
					imageUrl: '/fitness/activities/straight-leg-bounds.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 173,
					exerciseId: 91,
					slug: 'split-jacks',
					name: 'Split Jacks',
					imageUrl: '/fitness/activities/split-jacks.webp',
					amount: 30,
					type: 'timed'
				}
			]
		},
		{
			id: 28,
			day: 28,
			title: 'Total Body - Day 28: Yoga',
			description:
				'Hold each pose for 30 seconds then move on to the next one. Repeat the sequence again on the other side.',
			imageUrl: '/fitness/workouts/day28.jpg',
			sets: 1,
			restBetweenExercises: 10,
			restBetweenSets: 30,
			activities: [
				{
					id: 174,
					exerciseId: 24,
					slug: 'high-plank-hold',
					name: 'High Plank Hold',
					imageUrl: '/fitness/activities/high-plank-hold.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 175,
					exerciseId: 31,
					slug: 'knees-hover-plank',
					name: 'Knees-Hover Plank',
					imageUrl: '/fitness/activities/knees-hover-plank.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 176,
					exerciseId: 16,
					slug: 'downward-facing-dog',
					name: 'Downward-Facing Dog',
					imageUrl: '/fitness/activities/downward-facing-dog.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 177,
					exerciseId: 103,
					slug: 'upward-facing-dog',
					name: 'Upward-Facing Dog',
					imageUrl: '/fitness/activities/upward-facing-dog.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 178,
					exerciseId: 57,
					slug: 'reclined-spinal-twist-right',
					name: 'Reclined Spinal Twist Right',
					imageUrl: '/fitness/activities/reclined-spinal-twist-right.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 179,
					exerciseId: 97,
					slug: 'tabletop-bridge-reach-right',
					name: 'Tabletop Bridge Reach Right',
					imageUrl: '/fitness/activities/tabletop-bridge-reach-right.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 180,
					exerciseId: 56,
					slug: 'reclined-spinal-twist-left',
					name: 'Reclined Spinal Twist Left',
					imageUrl: '/fitness/activities/reclined-spinal-twist-left.webp',
					amount: 30,
					type: 'timed'
				},
				{
					id: 181,
					exerciseId: 96,
					slug: 'tabletop-bridge-reach-left',
					name: 'Tabletop Bridge Reach Left',
					imageUrl: '/fitness/activities/tabletop-bridge-reach-left.webp',
					amount: 30,
					type: 'timed'
				}
			]
		},
		{
			id: 29,
			day: 29,
			title: 'Total Body - Day 29: Build',
			description:
				'Five-set total body routine: split lunges, lunge step-ups, side-to-side lunges, shoulder taps, plank rotations and plank leg raises. Perform 5 sets in total with 60 seconds rest between exercises and 30 seconds rest between sets.',
			imageUrl: '/fitness/workouts/day29.jpg',
			sets: 5,
			restBetweenExercises: 60,
			restBetweenSets: 30,
			activities: [
				{
					id: 182,
					exerciseId: 92,
					slug: 'split-lunges',
					name: 'Split Lunges',
					imageUrl: '/fitness/activities/split-lunges.webp',
					amount: 18,
					type: 'reps'
				},
				{
					id: 183,
					exerciseId: 39,
					slug: 'lunge-step-ups',
					name: 'Lunge Step-Ups',
					imageUrl: '/fitness/activities/lunge-step-ups.webp',
					amount: 18,
					type: 'reps'
				},
				{
					id: 184,
					exerciseId: 85,
					slug: 'side-to-side-lunges',
					name: 'Side-to-Side Lunges',
					imageUrl: '/fitness/activities/side-to-side-lunges.webp',
					amount: 18,
					type: 'reps'
				},
				{
					id: 185,
					exerciseId: 76,
					slug: 'shoulder-taps',
					name: 'Shoulder Taps',
					imageUrl: '/fitness/activities/shoulder-taps.webp',
					amount: 26,
					type: 'reps'
				},
				{
					id: 186,
					exerciseId: 47,
					slug: 'plank-rotations',
					name: 'Plank Rotations',
					imageUrl: '/fitness/activities/plank-rotations.webp',
					amount: 26,
					type: 'reps'
				},
				{
					id: 187,
					exerciseId: 46,
					slug: 'plank-leg-raises',
					name: 'Plank Leg Raises',
					imageUrl: '/fitness/activities/plank-leg-raises.webp',
					amount: 26,
					type: 'reps'
				}
			]
		},
		{
			id: 30,
			day: 30,
			title: 'Total Body - Day 30: Abs & Core',
			description:
				'Abs & core circuit: leg raises, flutter kicks, raised legs circles and a hollow hold. Perform 5 sets (Level III) with 2 minutes rest between sets.',
			imageUrl: '/fitness/workouts/day30.jpg',
			sets: 5,
			restBetweenExercises: 0,
			restBetweenSets: 120,
			activities: [
				{
					id: 188,
					exerciseId: 38,
					slug: 'leg-raises',
					name: 'Leg Raises',
					imageUrl: '/fitness/activities/leg-raises.webp',
					amount: 14,
					type: 'reps'
				},
				{
					id: 189,
					exerciseId: 18,
					slug: 'flutter-kicks',
					name: 'Flutter Kicks',
					imageUrl: '/fitness/activities/flutter-kicks.webp',
					amount: 14,
					type: 'reps'
				},
				{
					id: 190,
					exerciseId: 55,
					slug: 'raised-legs-circles',
					name: 'Raised Legs Circles',
					imageUrl: '/fitness/activities/raised-legs-circles.webp',
					amount: 14,
					type: 'reps'
				},
				{
					id: 191,
					exerciseId: 26,
					slug: 'hollow-hold',
					name: 'Hollow Hold',
					imageUrl: '/fitness/activities/hollow-hold.webp',
					amount: 10,
					type: 'timed'
				}
			]
		}
	]
} as const;

const repExercises = [
	{
		id: 1,
		slug: 'back-extensions',
		name: 'Back Extensions',
		type: 'reps',
		imageUrl: '/fitness/activities/back-extensions.webp',
		workoutCount: 2
	},
	{
		id: 6,
		slug: 'bridges',
		name: 'Bridges',
		type: 'reps',
		imageUrl: '/fitness/activities/bridges.webp',
		workoutCount: 2
	},
	{
		id: 9,
		slug: 'calf-raises',
		name: 'Calf Raises',
		type: 'reps',
		imageUrl: '/fitness/activities/calf-raises.webp',
		workoutCount: 2
	},
	{
		id: 11,
		slug: 'cossack-squats',
		name: 'Cossack Squats',
		type: 'reps',
		imageUrl: '/fitness/activities/cossack-squats.webp',
		workoutCount: 2
	},
	{
		id: 12,
		slug: 'crunch-kicks',
		name: 'Crunch Kicks',
		type: 'reps',
		imageUrl: '/fitness/activities/crunch-kicks.webp',
		workoutCount: 1
	},
	{
		id: 13,
		slug: 'dead-bug',
		name: 'Dead Bug',
		type: 'reps',
		imageUrl: '/fitness/activities/dead-bug.webp',
		workoutCount: 1
	},
	{
		id: 18,
		slug: 'flutter-kicks',
		name: 'Flutter Kicks',
		type: 'reps',
		imageUrl: '/fitness/activities/flutter-kicks.webp',
		workoutCount: 2
	},
	{
		id: 19,
		slug: 'forward-lunges',
		name: 'Forward Lunges',
		type: 'reps',
		imageUrl: '/fitness/activities/forward-lunges.webp',
		workoutCount: 1
	},
	{
		id: 20,
		slug: 'get-ups',
		name: 'Get-Ups',
		type: 'reps',
		imageUrl: '/fitness/activities/get-ups.webp',
		workoutCount: 1
	},
	{
		id: 21,
		slug: 'heel-taps',
		name: 'Heel Taps',
		type: 'reps',
		imageUrl: '/fitness/activities/heel-taps.webp',
		workoutCount: 1
	},
	{
		id: 22,
		slug: 'high-crunches',
		name: 'High Crunches',
		type: 'reps',
		imageUrl: '/fitness/activities/high-crunches.webp',
		workoutCount: 1
	},
	{
		id: 27,
		slug: 'hops-on-the-spot',
		name: 'Hops on the Spot',
		type: 'reps',
		imageUrl: '/fitness/activities/hops-on-the-spot.webp',
		workoutCount: 3
	},
	{
		id: 28,
		slug: 'jumping-jacks',
		name: 'Jumping Jacks',
		type: 'reps',
		imageUrl: '/fitness/activities/jumping-jacks.webp',
		workoutCount: 11
	},
	{
		id: 29,
		slug: 'knee-in-twist',
		name: 'Knee-in Twist',
		type: 'reps',
		imageUrl: '/fitness/activities/knee-in-twist.webp',
		workoutCount: 1
	},
	{
		id: 30,
		slug: 'knee-to-elbow',
		name: 'Knee-to-Elbow',
		type: 'reps',
		imageUrl: '/fitness/activities/knee-to-elbow.webp',
		workoutCount: 3
	},
	{
		id: 37,
		slug: 'leg-circles',
		name: 'Leg Circles',
		type: 'reps',
		imageUrl: '/fitness/activities/leg-circles.webp',
		workoutCount: 1
	},
	{
		id: 38,
		slug: 'leg-raises',
		name: 'Leg Raises',
		type: 'reps',
		imageUrl: '/fitness/activities/leg-raises.webp',
		workoutCount: 2
	},
	{
		id: 39,
		slug: 'lunge-step-ups',
		name: 'Lunge Step-Ups',
		type: 'reps',
		imageUrl: '/fitness/activities/lunge-step-ups.webp',
		workoutCount: 2
	},
	{
		id: 45,
		slug: 'plank-arm-raises',
		name: 'Plank Arm Raises',
		type: 'reps',
		imageUrl: '/fitness/activities/plank-arm-raises.webp',
		workoutCount: 2
	},
	{
		id: 46,
		slug: 'plank-leg-raises',
		name: 'Plank Leg Raises',
		type: 'reps',
		imageUrl: '/fitness/activities/plank-leg-raises.webp',
		workoutCount: 2
	},
	{
		id: 47,
		slug: 'plank-rotations',
		name: 'Plank Rotations',
		type: 'reps',
		imageUrl: '/fitness/activities/plank-rotations.webp',
		workoutCount: 3
	},
	{
		id: 48,
		slug: 'prone-reverse-fly',
		name: 'Prone Reverse Fly',
		type: 'reps',
		imageUrl: '/fitness/activities/prone-reverse-fly.webp',
		workoutCount: 2
	},
	{
		id: 55,
		slug: 'raised-legs-circles',
		name: 'Raised Legs Circles',
		type: 'reps',
		imageUrl: '/fitness/activities/raised-legs-circles.webp',
		workoutCount: 1
	},
	{
		id: 58,
		slug: 'reverse-angels',
		name: 'Reverse Angels',
		type: 'reps',
		imageUrl: '/fitness/activities/reverse-angels.webp',
		workoutCount: 2
	},
	{
		id: 59,
		slug: 'reverse-crunches',
		name: 'Reverse Crunches',
		type: 'reps',
		imageUrl: '/fitness/activities/reverse-crunches.webp',
		workoutCount: 1
	},
	{
		id: 60,
		slug: 'reverse-deep-lunges',
		name: 'Reverse Deep Lunges',
		type: 'reps',
		imageUrl: '/fitness/activities/reverse-deep-lunges.webp',
		workoutCount: 1
	},
	{
		id: 61,
		slug: 'reverse-lunges',
		name: 'Reverse Lunges',
		type: 'reps',
		imageUrl: '/fitness/activities/reverse-lunges.webp',
		workoutCount: 2
	},
	{
		id: 67,
		slug: 'scissors',
		name: 'Scissors',
		type: 'reps',
		imageUrl: '/fitness/activities/scissors.webp',
		workoutCount: 1
	},
	{
		id: 68,
		slug: 'seal-jacks',
		name: 'Seal Jacks',
		type: 'reps',
		imageUrl: '/fitness/activities/seal-jacks.webp',
		workoutCount: 3
	},
	{
		id: 76,
		slug: 'shoulder-taps',
		name: 'Shoulder Taps',
		type: 'reps',
		imageUrl: '/fitness/activities/shoulder-taps.webp',
		workoutCount: 6
	},
	{
		id: 77,
		slug: 'side-bridges',
		name: 'Side Bridges',
		type: 'reps',
		imageUrl: '/fitness/activities/side-bridges.webp',
		workoutCount: 1
	},
	{
		id: 84,
		slug: 'side-to-side-hops',
		name: 'Side-to-Side Hops',
		type: 'reps',
		imageUrl: '/fitness/activities/side-to-side-hops.webp',
		workoutCount: 2
	},
	{
		id: 85,
		slug: 'side-to-side-lunges',
		name: 'Side-to-Side Lunges',
		type: 'reps',
		imageUrl: '/fitness/activities/side-to-side-lunges.webp',
		workoutCount: 3
	},
	{
		id: 88,
		slug: 'sit-ups',
		name: 'Sit Ups',
		type: 'reps',
		imageUrl: '/fitness/activities/sit-ups.webp',
		workoutCount: 1
	},
	{
		id: 89,
		slug: 'sitting-twists',
		name: 'Sitting Twists',
		type: 'reps',
		imageUrl: '/fitness/activities/sitting-twists.webp',
		workoutCount: 1
	},
	{
		id: 90,
		slug: 'slow-climber-taps',
		name: 'Slow Climber Taps',
		type: 'reps',
		imageUrl: '/fitness/activities/slow-climber-taps.webp',
		workoutCount: 1
	},
	{
		id: 92,
		slug: 'split-lunges',
		name: 'Split Lunges',
		type: 'reps',
		imageUrl: '/fitness/activities/split-lunges.webp',
		workoutCount: 3
	},
	{
		id: 93,
		slug: 'squats',
		name: 'Squats',
		type: 'reps',
		imageUrl: '/fitness/activities/squats.webp',
		workoutCount: 2
	},
	{
		id: 98,
		slug: 'thigh-taps',
		name: 'Thigh Taps',
		type: 'reps',
		imageUrl: '/fitness/activities/thigh-taps.webp',
		workoutCount: 2
	},
	{
		id: 101,
		slug: 'toe-tap-hops',
		name: 'Toe Tap Hops',
		type: 'reps',
		imageUrl: '/fitness/activities/toe-tap-hops.webp',
		workoutCount: 3
	},
	{
		id: 102,
		slug: 'up-down-planks',
		name: 'Up & Down Planks',
		type: 'reps',
		imageUrl: '/fitness/activities/up-&-down-planks.webp',
		workoutCount: 1
	},
	{
		id: 104,
		slug: 'w-extensions',
		name: 'W-Extensions',
		type: 'reps',
		imageUrl: '/fitness/activities/w-extensions.webp',
		workoutCount: 2
	},
	{
		id: 107,
		slug: 'windshield-wipers',
		name: 'Windshield Wipers',
		type: 'reps',
		imageUrl: '/fitness/activities/windshield-wipers.webp',
		workoutCount: 1
	}
] as const;

export function fitnessProgram(speeds: Record<number, number>): WorkoutProgram {
	return {
		...baseProgram,
		workouts: baseProgram.workouts.map((workout) => ({
			...workout,
			activities: workout.activities.map((activity) =>
				activity.type === 'reps'
					? { ...activity, speedPercent: speeds[activity.exerciseId] ?? 100 }
					: activity
			)
		}))
	};
}

export function exercisePreferences(speeds: Record<number, number>): ExercisePreference[] {
	return repExercises.map((exercise) => ({
		...exercise,
		speedPercent: speeds[exercise.id] ?? 100
	}));
}

export function workoutDay(workoutId: number) {
	return baseProgram.workouts.find(({ id }) => id === workoutId)?.day;
}
