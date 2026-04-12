const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'openai/gpt-4o-mini';

const SYSTEM_PROMPT = `You are a meeting assistant. You receive a short audio transcript from an ongoing meeting.
Your job is to produce a concise structured summary.
Always respond in the same language as the transcript.
Format your response as JSON with these exact keys: "summary" (2 sentences max), "decisions" (array of strings, may be empty), "actions" (array of strings, may be empty).`;

export async function summarizeTranscript(transcript: string): Promise<{
  summary: string;
  decisions: string[];
  actions: string[];
}> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY is not set');

  const res = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Transcript:\n${transcript}` },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter summarization failed: ${res.status} ${err}`);
  }

  const data = await res.json() as { choices: { message: { content: string } }[] };
  return JSON.parse(data.choices[0].message.content);
}
