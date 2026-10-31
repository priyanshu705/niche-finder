const { gemini, readBody, cleanMessages, langName } = require('./_lib');

const MAX_Q = 16; // hard stop so one chat cannot run forever

function system(lang, asked) {
  return `You are a warm, sharp niche-discovery coach. You interview a person (a working professional, freelancer or consultant) to find the business niche hidden in their real experience. They want to start a part-time business.

Reply language: ${langName(lang)}.

Rules:
- Ask exactly ONE question per message. Keep it short (max 2 sentences). No lists, no markdown.
- Total about 15 questions. You have asked ${asked} so far.
- Cover, over the interview: name and current role; industry and years; what they actually did day to day; HOW they did the work (methods, routines, tools); their proudest results with numbers; problems people come to them for help with; who those people were; what they enjoy and what drains them; what they would never do; how many hours per week they can give; income goal and timeline; who they already know (network, audience); any proof or testimonials; how they prefer to work (1:1, group, online).
- Dig deeper when an answer is vague: ask for a real example or a number.
- Never recommend a niche during the interview. Do not summarise until the end.
- Be encouraging but do not flatter. Do not repeat the person's words back at length.
- When you have enough (about 15 questions answered), write a 1-2 sentence thank-you that says you are now preparing their report, and end the message with the exact token [[DONE]].`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const body = readBody(req);
    const msgs = cleanMessages(body.messages);
    const lang = body.lang || 'hinglish';
    const asked = msgs.filter((m) => m.role === 'model').length;
    if (asked >= MAX_Q) {
      return res.status(200).json({ reply: '', done: true });
    }
    const contents = msgs.map((m) => ({ role: m.role, parts: [{ text: m.text }] }));
    if (!contents.length || contents[0].role !== 'user') {
      contents.unshift({ role: 'user', parts: [{ text: 'START' }] });
    }
    let text = await gemini({ system: system(lang, asked), contents, temperature: 0.8, maxOutputTokens: 600 });
    const done = /\[\[DONE\]\]/.test(text);
    text = text.replace(/\[\[DONE\]\]/g, '').trim();
    return res.status(200).json({ reply: text, done });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
