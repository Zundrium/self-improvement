import { describe, expect, it } from 'vitest';
import { draftFingerprint, snapshotDraft, type EntryDraft } from './draft';

describe('nutrition entry drafts', () => {
	it('freezes the submitted payload while later edits remain in the draft', () => {
		const draft: EntryDraft = {
			date: '2026-09-05',
			time: '12:00',
			name: 'Lunch',
			notes: '',
			meals: []
		};
		const submitted = snapshotDraft(draft);
		draft.notes = 'edited while saving';
		expect(submitted.notes).toBe('');
		expect(draftFingerprint(draft)).not.toBe(draftFingerprint(submitted));
	});
});
