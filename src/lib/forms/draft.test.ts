import { describe, expect, it } from 'vitest';
import { sameDraft, submittedSnapshot } from './draft';

describe('form draft snapshots', () => {
	it('keeps the submitted baseline separate from edits made during a save', () => {
		const draft = { name: 'Before', nested: { enabled: true } };
		const submitted = submittedSnapshot(draft);
		draft.name = 'After';
		draft.nested.enabled = false;
		expect(submitted).toEqual({ name: 'Before', nested: { enabled: true } });
		expect(sameDraft(draft, submitted)).toBe(false);
	});
});
