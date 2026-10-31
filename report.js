const { gemini, readBody, cleanMessages, langName } = require('./_lib');

const WEIGHTS = { love: 0.2, good_at: 0.3, needs: 0.25, paid: 0.25 };
const S = { type: 'STRING' };
const arr = (items) => ({ type: 'ARRAY', items });
const obj = (properties) => ({ type: 'OBJECT', properties, required: Object.keys(properties) });

const SCHEMA = obj({
  client_name: S,
  profile: arr(obj({ label: S, value: S })),
  insights: arr(S),
  niches: arr(obj({
    name: S, short: S, why: S,
    scores: obj({ love: { type: 'INTEGER' }, good_at: { type: 'INTEGER' }, needs: { type: 'INTEGER' }, paid: { type: 'INTEGER' } }),
  })),
  persona: obj({ who: S, pain: S, promise: S, statement: S }),
  offers: arr(obj({ name: S, price_label: S, price_inr: { type: 'INTEGER' }, unit: S, includes: S })),
  roadmap: arr(obj({ phase: S, steps: arr(S) })),
  meeting: arr(obj({ time: S, stage: S, action: S })),
  webinar: arr(obj({ time: S, section: S, action: S })),
  next_steps: arr(S),
});

function prompt(lang) {
  return `You are a niche-discovery strategist. Read the interview transcript and produce a complete, practical plan for ONE person who wants to start a part-time business from their real experience.

Write all text values in: ${langName(lang)}. Keep JSON keys in English.

Content rules:
- Base everything on what the person actually said. Do not invent achievements, employers or numbers. If a detail is missing, say so briefly instead of guessing.
- profile: 6-8 label/value pairs (Background, Roles, Scale, Goal, Strengths, Enjoys, Dislikes, Time available).
- insights: 3-4 short observations about the pattern in their experience that points to a niche.
- niches: exactly 3 candidate niches. Make niche 1 your honest best fit and make the other two realistic alternatives (one broader, one different audience). Score each 1-10 on love (they enjoy it), good_at (proven by their experience), needs (people clearly need it), paid (people pay for it). Be honest, do not give all high scores. "why" is 1-2 sentences of reasoning tied to their answers.
- persona: who they help (specific audience), the pain, the promise, and a one-line positioning statement starting with "I help".
- offers: 3 steps of an offer ladder: a free entry offer (price_inr 0, unit "free"), a main paid offer, and a recurring or higher offer. price_inr is a sensible starting price in Indian rupees for the audience (integer). unit is one of "free", "one-time", "per month". price_label is a readable price. These are starting points to test.
- roadmap: exactly 3 phases named "Days 1-30: ...", "Days 31-60: ...", "Days 61-90: ...", each with 4-5 concrete steps by week. Respect their weekly hours and what they dislike (for example no cold calling).
- meeting: a 45-minute discovery-call structure of 6 stages with time ranges, stage names, and what to do or say.
- webinar: a 60-minute webinar structure of 6 sections with time ranges and what to do.
- next_steps: 4 actions for this week.
Return only JSON.`;
}

function score(r) {
  const n = (r.niches || []).map((x) => {
    const s = x.scores || {};
    const clamp = (v) => Math.max(1, Math.min(10, Number(v) || 1));
    const sc = { love: clamp(s.love), good_at: clamp(s.good_at), needs: clamp(s.needs), paid: clamp(s.paid) };
    const total = Object.keys(WEIGHTS).reduce((a, k) => a + sc[k] * WEIGHTS[k], 0);
    return { ...x, scores: sc, total: Math.round(total * 100) / 100 };
  });
  n.sort((a, b) => b.total - a.total);
  r.niches = n;
  r.weights = WEIGHTS;
  return r;
}

async function save(r, body) {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return;
  try {
    await fetch(`${url}/rest/v1/niche_sessions`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ client_name: r.client_name || null, lang: body.lang || null, transcript: body.messages, report: r }),
    });
  } catch { /* saving is best effort */ }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const body = readBody(req);
    const msgs = cleanMessages(body.messages).filter((m) => m.text !== 'START');
    if (msgs.filter((m) => m.role === 'user').length < 3) {
      return res.status(400).json({ error: 'Not enough interview answers yet' });
    }
    const transcript = msgs.map((m) => `${m.role === 'model' ? 'COACH' : 'PERSON'}: ${m.text}`).join('\n');
    const text = await gemini({
      system: prompt(body.lang || 'hinglish'),
      contents: [{ role: 'user', parts: [{ text: `INTERVIEW TRANSCRIPT\n\n${transcript}` }] }],
      json: true, schema: SCHEMA, temperature: 0.5, maxOutputTokens: 8192,
    });
    let r;
    try { r = JSON.parse(text); } catch { throw new Error('The AI returned an unreadable report. Please try again.'); }
    if (!Array.isArray(r.niches) || r.niches.length < 1) throw new Error('The AI report was incomplete. Please try again.');
    r = score(r);
    await save(r, body);
    return res.status(200).json({ report: r });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
