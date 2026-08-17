type EmailEnv = {
	EMAIL_FROM?: string;
	RESEND_API_KEY?: string;
};

type EmailInput = {
	to: string;
	subject: string;
	text: string;
	html?: string;
};

export async function sendEmail(env: EmailEnv, input: EmailInput) {
	const apiKey = readString(env.RESEND_API_KEY);
	if (!apiKey) return;
	const response = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({ from: readFrom(env.EMAIL_FROM), ...input })
	});
	if (!response.ok) throw new Error(`Email provider failed with ${response.status}`);
}

function readFrom(value: unknown) {
	return readString(value) || 'Self Improvement <noreply@example.com>';
}

function readString(value: unknown) {
	return typeof value === 'string' ? value : '';
}
