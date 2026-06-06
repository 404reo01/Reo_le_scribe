// Groq Whisper — fast, free tier available, OpenAI-compatible API
const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const MODEL = 'whisper-large-v3-turbo';

export async function transcribeAudio(audioBuffer: Buffer, mimeType = 'audio/webm'): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY is not set');

  const safeBuffer = audioBuffer.buffer.slice(audioBuffer.byteOffset, audioBuffer.byteOffset + audioBuffer.byteLength) as ArrayBuffer;
  const h = new Uint8Array(safeBuffer).slice(0, 4);
  console.log(`[transcribe] size=${audioBuffer.byteLength} header=${Array.from(h).map(b=>b.toString(16).padStart(2,'0')).join(' ')}`);

  const form = new FormData();
  form.append('file', new Blob([safeBuffer], { type: 'audio/webm' }), 'recording.webm');
  form.append('model', MODEL);
  form.append('response_format', 'text');

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq transcription failed: ${res.status} ${err}`);
  }

  return res.text();
}
