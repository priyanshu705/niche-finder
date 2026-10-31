// Offline test mode (MOCK=1). Never used in production unless MOCK is set.
const QS = [
  'Hi! Pehle batao, tumhara naam kya hai aur abhi tum kya kaam karte ho?',
  'Kitne saal se coaching industry mein ho, aur kaun si roles kari hain?',
  'Roz ka din kaisa hota tha? Actual kaam kya karte the?',
  'Koi ek result jispe tumhe garv hai? Numbers ke saath batao.',
  'Log tumse sabse zyada kis problem mein help maangte the?',
  'Thank you, ab main tumhari report bana raha hoon. [[DONE]]',
];
const REPORT = {
  client_name: 'Rohit Verma (test)',
  profile: [
    { label: 'Background', value: '5 years in an exam-prep coaching institute' },
    { label: 'Roles', value: 'Admissions counsellor, then centre head' },
    { label: 'Goal', value: 'Part-time business, 8-10 hours a week' },
    { label: 'Dislikes', value: 'Cold calling and daily content' },
  ],
  insights: ['His strongest proof is fixing the enquiry-to-admission funnel.', 'Other centre owners already ask him for advice.', 'He wants low-content, warm outreach.'],
  niches: [
    { name: 'Admissions and retention coach for small coaching institutes', short: 'Growth coach for small centres', why: 'Matches his proven results and the advice owners already seek.', scores: { love: 8, good_at: 9, needs: 8, paid: 8 } },
    { name: 'Career counsellor for Class 11-12 parents', short: 'Career counsellor', why: 'Crowded and low price expectations.', scores: { love: 7, good_at: 8, needs: 7, paid: 5 } },
    { name: 'General startup business coach', short: 'Startup coach', why: 'No proof of startup experience.', scores: { love: 6, good_at: 4, needs: 7, paid: 6 } },
  ],
  persona: { who: 'Owners of coaching centres with 50-300 students', pain: 'Enquiries do not become admissions and students leave mid-year', promise: 'A simple follow-up system the owner can run alone', statement: 'I help small coaching institute owners convert more enquiries into admissions and keep students enrolled.' },
  offers: [
    { name: 'Free 30-min Centre Check', price_label: 'Free', price_inr: 0, unit: 'free', includes: 'Review a month of enquiries and name the 3 biggest leaks' },
    { name: 'Admissions Sprint', price_label: 'Rs 24,999 for 4 weeks', price_inr: 24999, unit: 'one-time', includes: 'Scripts, tracker, weekly call' },
    { name: 'Retention Retainer', price_label: 'Rs 12,999 per month', price_inr: 12999, unit: 'per month', includes: 'Monthly parent plan and review' },
  ],
  roadmap: [
    { phase: 'Days 1-30: Validate and package', steps: ['Week 1: list 30 owners', 'Week 2: 8 listening calls', 'Week 3: name the 3-step method', 'Week 4: build the offer page'] },
    { phase: 'Days 31-60: First paying clients', steps: ['Week 5: book 5 free checks', 'Week 6: run checks and pitch', 'Week 7-8: deliver 2 sprints'] },
    { phase: 'Days 61-90: Proof and repeat', steps: ['Week 9: case study', 'Week 10: first webinar', 'Week 11-12: retainers and referrals'] },
  ],
  meeting: [
    { time: '0-5 min', stage: 'Warm start', action: 'State the goal of the call.' },
    { time: '5-15 min', stage: 'Diagnose', action: 'Ask about last month enquiries.' },
    { time: '15-25 min', stage: 'Show the leak', action: 'Draw the funnel.' },
    { time: '25-35 min', stage: 'Method', action: 'Explain the 3 steps.' },
    { time: '35-42 min', stage: 'Offer', action: 'Present the sprint.' },
    { time: '42-45 min', stage: 'Next step', action: 'Ask for a decision date.' },
  ],
  webinar: [
    { time: '0-5 min', section: 'Hook', action: 'Name the pain.' },
    { time: '5-12 min', section: 'Story', action: 'Short true story.' },
    { time: '12-32 min', section: 'Method', action: 'Teach 3 steps.' },
    { time: '32-40 min', section: 'Proof', action: 'Before and after.' },
    { time: '40-50 min', section: 'Offer', action: 'Invite to free check.' },
    { time: '50-60 min', section: 'Q&A', action: 'Answer live.' },
  ],
  next_steps: ['Book 8 listening calls', 'Write the one-line statement', 'Fill the workbook', 'Block 2 weekly slots'],
};
exports.mock = ({ contents, json }) => {
  if (json) return JSON.stringify(REPORT);
  const asked = contents.filter((c) => c.role === 'model').length;
  return QS[Math.min(asked, QS.length - 1)];
};
