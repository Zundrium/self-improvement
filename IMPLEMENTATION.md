# Implementation Plan

## 1. Daily overview

- Design one mobile-height home screen together.
- Show today’s meditation, workout, and calorie status.
- Make each status open its full tool.
- Build the layout with Lily components before connecting real data.

## 2. Shared data

- Add user-owned D1 tables for calorie entries, workouts, and meditation sessions.
- Use one local date key across all three tools.
- Load the daily overview from these shared records.

## 3. Calorie counter

- Reimplement `../ai-calorie-counter` without changing its UI or behavior.
- Keep onboarding, calorie targets, meal entry, image analysis, and daily history.
- Reuse the centralized account and D1 infrastructure instead of its separate auth setup.

## 4. Fitness

- Reimplement workouts and completion tracking from `../zun-fitness`.
- Remove the music player, audio service, and all fitness audio files.
- Start with the existing workout calendar and session flow.
- Later replace the calendar landing view with a simpler daily status when useful.

## 5. Meditation

Status: implemented first.

- Reimplement only the timer and looping ambient sounds from `../meditate`.
- Keep the existing rain, wind, fire, water, bird, and similar sound loops.
- Remove Astro, GSAP, Lenis, particles, scene graphics, and decorative image assets.
- Use a standard Lily screen and save completed meditation sessions to D1.

## 6. Final integration

- Make all routes mobile-first and consistent with Lily UI.
- Verify each module updates the home status immediately.
- Test authentication, daily boundaries, persistence, timers, and audio cleanup.
- Migrate existing data only after the new flows match the source apps.
