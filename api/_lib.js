// Shared helpers for the serverless functions.
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const LANGS = {
  hinglish: 'Hinglish: Hindi written in Roman letters mixed with simple English, casual and warm, the way people talk on WhatsApp',
  english: 'simple, clear English',
  hindi: 'Hindi written in Devanagari script, simple everyday words',
};
const langName = (l) => LANGS[l] || LANGS.hinglish;

async function gemini({ system, contents, json = false, schema, temperature = 0.7, maxOutputTokens = 2048 }) {
  if (process.env.MOCK === '1') return require('./_mock').mock({ contents, json });
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set on the server');
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: { temperature, maxOutputTokens },
  };
  if (json) {
    body.generationConfig.responseMimeType = 'application/json';
    if (schema) body.generationConfig.responseSchema = schema;
  }
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j.error && j.error.message) || `Gemini error ${r.status}`);
  const parts = j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts;
  const text = (parts || []).map((p) => p.text || '').join('');
  if (!text) throw new Error('Gemini returned an empty answer');
  return text;
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch { return {}; }
}

// Keep the free key safe from abuse: cap size of what we accept.
function cleanMessages(list) {
  if (!Array.isArray(list)) return [];
  return list.slice(-60).map((m) => ({
    role: m.role === 'model' ? 'model' : 'user',
    text: String(m.text || '').slice(0, 2500),
  }));
}

module.exports = { gemini, readBody, cleanMessages, langName };
