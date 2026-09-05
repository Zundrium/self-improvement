# Android smoke test

Run this checklist on a physical Android device after a release-candidate sync.

- Launch, complete setup, use Android Back through routes and modals, and verify keyboard-safe action bars.
- Grant and revoke Health Connect and Usage Access; resume the app and verify permission status and sync retry.
- Create a backup with nutrition media, restore it during an active session, and verify photos, entries, reminder settings and refreshed screens. Check a history close to the 25 MiB limit, and verify an oversized export fails without claiming a file was saved.
- Leave each tracker open across midnight and background/resume it; confirm no timer completion is awarded without an explicit foreground action.
- Exercise fitness/stretch audio, pause/skip/close, and verify no late audio or wake lock remains.
- Create a meal manually without a key or network. Capture and analyze a camera image; cancel camera/analysis and leave while saving. Verify a committed save cannot produce a duplicate even if subsequent navigation fails.
- Migrate a legacy OpenRouter key into secure storage, restart, clear the key, and confirm it stays cleared. Check notification behavior after restore and app resume.
- Verify Drive backup selection/retention, update prompt, screen reader navigation with TalkBack, and date navigation in positive and negative UTC offsets.
- In every tracker, use date arrows, the calendar and Android Back. Confirm the chart moves right for earlier dates and left for later dates without replaying page entry or resetting scroll. Reverse direction rapidly and jump across months; check the final date, graph and metric totals agree.
- Change dates during a pending save, then return to the original date. Verify drafts and save status belong to the selected date, and no old timer completes or resumes unexpectedly. Toggle reduced motion during a date transition and check that charts and values settle immediately.
