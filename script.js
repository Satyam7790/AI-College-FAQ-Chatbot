/**
 * CampusBot — Advanced AI College FAQ Assistant
 *
 * RAG Architecture:
 *  1. RETRIEVAL  — Find relevant FAQ entries from knowledge base via scoring
 *  2. AUGMENT    — Build a context-rich prompt with retrieved entries
 *  3. GENERATION — Gemini generates a natural, grounded answer
 *
 * New features:
 *  - Working topic sidebar with question lists
 *  - Global search (⌘K)
 *  - Light/Dark theme toggle (persisted)
 *  - Right-panel stats (coverage bars, last query)
 *  - Confidence score display
 *  - Source attribution
 *  - Better multi-turn memory management
 *  - Improved RAG retrieval with TF-IDF-like scoring
 */

// ── State ────────────────────────────────────────────────────────────────
let apiKey           = localStorage.getItem('AIzaSyA1IM88DsaeieToEWObXqY1YRmaVbAUpyU') || '';
let faqData          = [];
let conversationHistory = [];
let queryLogs        = [];
let isLoading        = false;
let totalFeedback    = 0;
let positiveFeedback = 0;
let answeredCount    = 0;
let queryCount       = 0;
let activeTopicFilter = 'all';

// ── Topic Configuration ──────────────────────────────────────────────────
const TOPICS = [
  { label: 'All Topics',        key: 'all',               icon: '🔍', color: '#6366f1' },
  { label: 'Admissions',        key: 'Admissions',         icon: '📋', color: '#10b981' },
  { label: 'Academics',         key: 'Academics',          icon: '📚', color: '#6366f1' },
  { label: 'Campus Facilities', key: 'Campus Facilities',  icon: '🏫', color: '#f59e0b' },
  { label: 'Events & Life',     key: 'Events & Life',      icon: '🎉', color: '#ec4899' },
  { label: 'Contacts',          key: 'Contacts',           icon: '📞', color: '#8b5cf6' },
];

const TOPIC_GRADIENTS = {
  'Admissions':        'linear-gradient(135deg,#10b981,#0ea5e9)',
  'Academics':         'linear-gradient(135deg,#6366f1,#818cf8)',
  'Campus Facilities': 'linear-gradient(135deg,#f59e0b,#ef4444)',
  'Events & Life':     'linear-gradient(135deg,#ec4899,#8b5cf6)',
  'Contacts':          'linear-gradient(135deg,#8b5cf6,#0ea5e9)',
  'all':               'linear-gradient(135deg,#6366f1,#0ea5e9)',
};

// ── FAQ Knowledge Base CSV ───────────────────────────────────────────────
const FAQ_CSV = `Topic,Intent/Category,Question Variations,Standard Answer
Admissions,B.Tech Eligibility,What is the eligibility for B.Tech? / Can I apply for engineering? / Marks required for B.Tech?,"To apply for B.Tech, you need a minimum of 60% aggregate in Physics, Chemistry, and Mathematics in your 12th-grade board exams."
Admissions,MBA Eligibility,MBA admission criteria? / How to get into the MBA program? / Do you need CAT scores?,"MBA admissions require a valid bachelor's degree with 50% marks and a valid CAT, MAT, or XAT scorecard, followed by a personal interview."
Admissions,Application Deadline,When is the last date to apply? / Admission deadline? / Is admission still open?,The deadline for all undergraduate applications is July 15th. Postgraduate application deadlines are August 1st.
Admissions,Application Process,How do I apply? / Where is the admission form? / Online application link?,"You can apply online through the university admission portal at admissions.college.edu. Create an account, fill out the form, and pay the application fee."
Admissions,Tuition Fees,What are the college fees? / How much is the tuition? / B.Tech fee structure?,"Tuition fees vary by program. B.Tech is $5,000 per semester, and MBA is $7,000 per semester. Please check the 'Fee Structure' PDF on the website for details."
Admissions,Required Documents,What documents are needed for admission? / Do I need my original mark sheets?,"You will need your 10th and 12th mark sheets, transfer certificate, migration certificate, passport-size photos, and a valid ID proof during enrollment."
Admissions,Scholarships,Do you offer scholarships? / How to get financial aid? / Merit scholarship details?,"Yes, we offer merit-based scholarships for students scoring above 90% in their board exams, as well as sports quotas and need-based financial aid."
Admissions,Education Loans,Do you have tie-ups for education loans? / Bank loan support?,We have official tie-ups with SBI and HDFC Bank to provide education loans at concessional interest rates for admitted students.
Admissions,International Students,Admission process for NRI/International students? / Foreign student quota?,International students must apply through the DASA scheme or directly through the International Students Office portal. A valid passport and English proficiency test score are required.
Admissions,Refund Policy,Can I get a refund if I cancel my admission? / Fee refund rules?,"Yes, fee refunds are processed according to UGC guidelines. If you withdraw before the course starts, a full refund minus a $50 processing fee will be issued."
Academics,Syllabus Location,Where can I find the syllabus? / Course curriculum? / What subjects will I study?,The detailed syllabus for all courses is available on the student intranet portal under the 'Academics' tab.
Academics,Academic Calendar,Where is the academic calendar? / When do classes start? / Semester dates?,The academic calendar for the 2024-2025 year is pinned on the university website's notice board and outlines all semester start and end dates.
Academics,Mid-term Dates,When are the mid-term exams? / Internal exam schedule?,Mid-term examinations generally take place in the 8th week of the semester. Exact dates will be shared by your department heads two weeks in advance.
Academics,Final Exam Dates,When are final exams? / End-semester exam dates?,"End-semester exams for the odd semester usually begin in the first week of December, and even semester exams begin in the first week of May."
Academics,Attendance Policy,What is the minimum attendance required? / How much attendance do I need?,Students must maintain a minimum of 75% attendance in each subject to be eligible to appear for the end-semester examinations.
Academics,Passing Marks,What is the passing grade? / Minimum marks to pass a subject?,The minimum passing requirement is 40% in internal assessments and 40% in the end-semester examination for each subject.
Academics,Grading System,How is the CGPA calculated? / What is the grading scale?,"We follow a 10-point credit-based grading system. A grade of 'O' is outstanding (10 points), 'A+' is excellent (9 points), down to 'F' for fail (0 points)."
Academics,Class Timetable,Where can I see my class schedule? / Timetable for 1st year?,Class timetables are uploaded to the student ERP dashboard three days before the start of the semester.
Academics,Transcripts,How do I get my official transcript? / Where to apply for a degree certificate?,Official transcripts can be requested via the university portal. It takes 5-7 working days to process and carries a fee of $10 per copy.
Academics,Branch Change,Can I change my branch after 1st year? / Engineering branch sliding rules?,Branch changes are permitted after the 1st year strictly based on merit (CGPA) and seat availability in the desired branch. You need a minimum CGPA of 8.5 to apply.
Campus Facilities,Hostel Timings,What are the hostel timings? / When does the hostel gate close? / Curfew timings?,The main campus gates close at 10:00 PM. The hostel in-time is 9:30 PM for all undergraduate students. Late entries require prior permission from the warden.
Campus Facilities,Hostel Allocation,How do I get a hostel room? / Hostel booking process?,"Hostel rooms are allocated on a first-come, first-served basis during admission. You must fill out the hostel request form and pay the hostel deposit online."
Campus Facilities,Library Hours,What are the library timings? / Is the library open on weekends?,"The central library is open Monday to Friday from 8:00 AM to 10:00 PM, and Saturday from 9:00 AM to 5:00 PM. It is closed on Sundays and public holidays."
Campus Facilities,Library Borrowing,How many books can I issue? / Library card limit?,Undergraduates can borrow up to 4 books for 14 days. Postgraduates can borrow up to 6 books for 21 days.
Campus Facilities,Campus WiFi,How do I connect to the campus WiFi? / What is the WiFi password?,Select the network 'Campus_Student_WiFi'. Log in using your student ID as the username and your ERP password as the network password.
Campus Facilities,Cafeteria Timings,When is the canteen open? / Cafeteria hours? / Where to get food?,The main cafeteria is open from 7:30 AM to 8:00 PM daily. There are also smaller kiosks around campus open until 11:00 PM.
Campus Facilities,Gym Hours,Can I use the college gym? / Gym timings? / Is there a fitness center?,"Yes, the campus fitness center is free for all enrolled students. It is open from 6:00 AM to 10:00 AM, and 4:00 PM to 9:00 PM."
Campus Facilities,Medical Clinic,Is there a doctor on campus? / Where to go if I am sick? / Medical room?,"The campus medical clinic is located on the ground floor of Block B. A general physician is available from 9:00 AM to 5:00 PM, and an ambulance is on standby 24/7."
Campus Facilities,Parking,Can students bring cars? / Student parking rules? / Two-wheeler parking?,Students are permitted to park two-wheelers in designated student parking lots. Four-wheeler parking is restricted to faculty and staff only.
Campus Facilities,Laundry,Is there a laundry service in the hostel? / Washing clothes?,"Yes, a paid laundry service operates near the hostel blocks. You can drop off clothes in the morning and pick them up the next evening."
Events & Life,Tech Fest,When is the annual tech fest? / Dates for the technical festival?,"Our annual national-level tech fest, 'TechNova', is usually held in the second week of February. Keep an eye on the notice boards for registration details!"
Events & Life,Cultural Fest,When is the cultural festival? / Annual college fest dates?,"The annual cultural fest, 'Symphony', takes place in mid-March. It features music, dance, drama, and art competitions."
Events & Life,Joining Clubs,How can I join the coding club? / Student club registrations?,Club recruitment drives happen during the first month of the odd semester. You can find their stalls during the club fair or reach out via their official social media pages.
Events & Life,Creating Clubs,Can I start a new student club? / How to form a society?,"Yes! To start a new club, you need a proposal, a faculty sponsor, and a minimum of 15 interested students. Submit the proposal to the Student Affairs Council."
Events & Life,Upcoming Holidays,When is the next holiday? / Is the college closed for Diwali?,Please check the official Academic Calendar for the complete list of approved public and institutional holidays.
Events & Life,Sports Facilities,What sports facilities do you have? / Is there a basketball court?,"We have a standard football field, a cricket ground, two basketball courts, an indoor badminton stadium, and table tennis rooms."
Events & Life,Inter-college Sports,Can I represent the college in sports? / Sports team selections?,"Yes, trials for university sports teams are held in August. Selected students represent the college in regional and national inter-college tournaments."
Events & Life,Fresher's Party,When is the Fresher's party? / Orientation and welcome party?,The official Fresher's welcome party is organized by the senior batch usually within the first three weeks of the new academic year.
Events & Life,Alumni Meet,When is the alumni reunion? / How to connect with alumni?,The annual Alumni Meet is held on the third Saturday of December. Students can also connect with alumni via the university's official alumni portal.
Events & Life,Hackathons,Does the college host hackathons? / Coding competitions?,"The Computer Science department and the Coding Club host 2-3 major hackathons every year, including a 24-hour internal hackathon in October."
Contacts,Admin Office,What is the admin office number? / How to contact administration?,You can reach the main administration office at (555) 123-4567 or email admin@college.edu.
Contacts,IT Support,Who do I contact for ERP login issues? / IT helpdesk email?,"For WiFi, ERP, or email login issues, please contact the IT Helpdesk at itsupport@college.edu or call extension 404 from any campus phone."
Contacts,Placement Cell,How do I contact the placement cell? / Career services email?,The Training and Placement Office (TPO) can be reached at placements@college.edu. Their office is on the 2nd floor of the Admin Block.
Contacts,CS Dept HOD,What is the email of the Computer Science HOD?,The Head of the Computer Science Department can be reached at hod.cs@college.edu.
Contacts,Anti-Ragging,How to report ragging? / Anti-ragging helpline?,We have a strict zero-tolerance policy for ragging. You can report incidents anonymously to the National Anti-Ragging Helpline at 1800-180-5522 or email antiragging@college.edu.
Contacts,Counselor,Is there a counselor on campus? / Mental health support?,"Yes, a professional student counselor is available. You can book a confidential appointment by emailing counselor@college.edu."
Contacts,Finance Dept,Who do I talk to about fee payment issues? / Accounts department?,"For fee receipts, loan documents, or payment failures, contact the Finance and Accounts Department at accounts@college.edu."
Contacts,Hostel Warden,How to contact the Chief Warden? / Hostel complaint number?,"The Chief Warden's office can be contacted at warden@college.edu. For immediate nighttime issues, contact the on-duty resident warden."
Contacts,Library Helpdesk,Who to contact for lost library books? / Library support?,"For queries regarding book issues, fines, or digital library access, email the head librarian at library@college.edu."
Contacts,Campus Security,What is the emergency security number? / Campus police?,"In case of any emergency on campus, contact the 24/7 Main Gate Security Office at (555) 999-0000."`;

// ── INIT ──────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  loadFAQFromCSV();
  buildTopicSidebar();
  buildWelcomeScreen();
  updateStats();
  initSearch();
  initKeyboardShortcuts();

  if (apiKey) {
    document.getElementById('apiSection')?.classList.add('hidden');
  }
});

// ── THEME ────────────────────────────────────────────────────────────────
function loadTheme() {
  const saved = localStorage.getItem('campusbot_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
}

document.getElementById('themeToggle')?.addEventListener('click', () => {
  const curr = document.documentElement.getAttribute('data-theme');
  const next = curr === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('campusbot_theme', next);
  showToast(next === 'dark' ? '🌙 Dark mode on' : '☀️ Light mode on');
});

// ── CSV PARSER ───────────────────────────────────────────────────────────
function loadFAQFromCSV() {
  const rows = parseCSV(FAQ_CSV);
  faqData = rows.map(row => ({
    topic:     row['Topic']               || '',
    intent:    row['Intent/Category']     || '',
    questions: row['Question Variations'] || '',
    answer:    row['Standard Answer']     || '',
  }));
  buildCoverageBars();
  console.log(`✅ Knowledge base loaded: ${faqData.length} FAQ entries`);
}

function parseCSV(csv) {
  let cur = '', inQuotes = false;
  const rawLines = [];
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (ch === '"') { inQuotes = !inQuotes; cur += ch; }
    else if (ch === '\n' && !inQuotes) { rawLines.push(cur); cur = ''; }
    else { cur += ch; }
  }
  if (cur) rawLines.push(cur);

  const headers = splitCSVLine(rawLines[0]);
  return rawLines.slice(1).filter(l => l.trim()).map(line => {
    const cols = splitCSVLine(line);
    const obj = {};
    headers.forEach((h, idx) => { obj[h.trim()] = (cols[idx] || '').replace(/^"|"$/g, '').trim(); });
    return obj;
  });
}

function splitCSVLine(line) {
  const cols = []; let cur = ''; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') { inQ = !inQ; }
    else if (line[i] === ',' && !inQ) { cols.push(cur); cur = ''; }
    else { cur += line[i]; }
  }
  cols.push(cur);
  return cols;
}

// ── RAG: RETRIEVAL ───────────────────────────────────────────────────────
/**
 * Improved retrieval using:
 * - Word-level matching with length weighting
 * - Exact phrase bonus
 * - Topic filter bonus
 * - Intent keyword matching
 */
function retrieveRelevantFAQs(userQuery, topN = 6) {
  const query = userQuery.toLowerCase().trim();
  const queryWords = query.split(/\s+/).filter(w => w.length > 2);

  const scored = faqData
    .filter(row => activeTopicFilter === 'all' || row.topic === activeTopicFilter)
    .map(row => {
      const searchText = `${row.topic} ${row.intent} ${row.questions} ${row.answer}`.toLowerCase();
      let score = 0;

      // Word match scoring
      for (const word of queryWords) {
        if (searchText.includes(word)) {
          score += word.length; // longer word = more specific = higher score
          // Bonus if it appears in the questions field specifically
          if (row.questions.toLowerCase().includes(word)) score += 3;
          // Bonus if it appears in the intent field
          if (row.intent.toLowerCase().includes(word)) score += 2;
        }
      }

      // Exact phrase bonus
      if (searchText.includes(query)) score += 20;

      // Active topic filter bonus
      if (activeTopicFilter !== 'all' && row.topic === activeTopicFilter) score += 5;

      return { ...row, score };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  return scored;
}

// Compute confidence score (0–1) based on retrieval quality
function computeConfidence(relevantFAQs, userQuery) {
  if (!relevantFAQs.length) return 0;
  const topScore = relevantFAQs[0].score;
  const queryLen = userQuery.split(/\s+/).length;
  const raw = Math.min(topScore / (queryLen * 5), 1);
  return Math.round(raw * 100);
}

// ── RAG: GENERATION ──────────────────────────────────────────────────────
async function generateWithGemini(userQuery, relevantFAQs) {
  if (!apiKey) return null;

  const contextBlock = relevantFAQs.length > 0
    ? relevantFAQs.map((f, i) =>
        `[FAQ ${i + 1}] Topic: ${f.topic} | Category: ${f.intent}\nQuestions: ${f.questions}\nAnswer: ${f.answer}`
      ).join('\n\n')
    : 'No directly relevant FAQ entries found in the knowledge base.';

  const systemInstruction = `You are CampusBot, a warm, helpful AI assistant for a college. You answer student questions using ONLY the FAQ knowledge base context provided below.

RESPONSE GUIDELINES:
- Write in a friendly, conversational tone — like a helpful senior student or advisor
- Keep responses focused and concise (2–4 sentences usually)
- Format with line breaks if listing multiple items
- Start with the direct answer, then add any helpful context
- If the context has an email or phone number, include it
- If the information is not in the context, say clearly: "I don't have specific information about that in my knowledge base. I recommend contacting the admin office at admin@college.edu or calling (555) 123-4567."
- Never invent or guess information not in the context
- Use 1 relevant emoji occasionally to keep the tone friendly

FAQ KNOWLEDGE BASE (retrieved for this query):
${contextBlock}`;

  const messages = [
    ...conversationHistory,
    { role: 'user', parts: [{ text: userQuery }] }
  ];

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: messages,
          generationConfig: {
            maxOutputTokens: 400,
            temperature: 0.3,
            topP: 0.85,
          }
        })
      }
    );

    if (!response.ok) {
      const err = await response.json();
      console.error('Gemini API error:', err);
      return null;
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch (e) {
    console.error('Network error calling Gemini:', e);
    return null;
  }
}

// ── DETECT TOPIC ─────────────────────────────────────────────────────────
function detectTopic(relevantFAQs) {
  if (!relevantFAQs.length) return 'General';
  return relevantFAQs[0].topic || 'General';
}

// ── MAIN SEND ────────────────────────────────────────────────────────────
async function sendMessage(prefill) {
  const input = document.getElementById('chatInput');
  const userMsg = (prefill || input.value).trim();
  if (!userMsg || isLoading) return;

  input.value = '';
  input.style.height = 'auto';

  // Remove welcome screen on first message
  const ws = document.getElementById('welcomeScreen');
  if (ws) ws.style.animation = 'welcomeFadeUp 0.25s reverse both';
  setTimeout(() => ws?.remove(), 200);

  renderUserBubble(userMsg);

  isLoading = true;
  document.getElementById('sendBtn').disabled = true;
  showTyping();

  // ── RAG Pipeline ──────────────────────────────────────────────────
  const relevantFAQs = retrieveRelevantFAQs(userMsg);
  const detectedTopic = detectTopic(relevantFAQs);
  const confidence = computeConfidence(relevantFAQs, userMsg);

  let botAnswer = null;
  let isAnswered = false;

  if (apiKey) {
    botAnswer = await generateWithGemini(userMsg, relevantFAQs);
    if (botAnswer) {
      isAnswered = true;
      conversationHistory.push({ role: 'user',  parts: [{ text: userMsg   }] });
      conversationHistory.push({ role: 'model', parts: [{ text: botAnswer }] });
      if (conversationHistory.length > 20) conversationHistory = conversationHistory.slice(-20);
    }
  }

  if (!botAnswer) {
    if (relevantFAQs.length > 0) {
      botAnswer = relevantFAQs[0].answer;
      isAnswered = true;
    } else if (!apiKey) {
      botAnswer = `Please add your Gemini API key in the right panel to enable AI-powered answers. I can still answer many questions directly from my knowledge base!`;
    } else {
      botAnswer = `I couldn't find specific information about that in my knowledge base. I'd recommend reaching out to the administration office at admin@college.edu or calling (555) 123-4567 for accurate assistance. 😊`;
    }
  }
  // ── End RAG ──────────────────────────────────────────────────────

  hideTyping();
  isLoading = false;
  document.getElementById('sendBtn').disabled = false;

  renderBotBubble(botAnswer, detectedTopic, relevantFAQs, confidence);
  addToLog(userMsg, detectedTopic, isAnswered);
  updateLastQuery(userMsg);
  updateStats();
}

function askQuestion(q) {
  document.getElementById('chatInput').value = q;
  sendMessage(q);
  closeTopicPanel();
}

function insertHint(q) {
  document.getElementById('chatInput').value = q;
  document.getElementById('chatInput').focus();
}

// ── RENDER: USER BUBBLE ───────────────────────────────────────────────────
function renderUserBubble(text) {
  const area = document.getElementById('messagesArea');
  const div = document.createElement('div');
  div.className = 'message user';
  div.innerHTML = `
    <div class="msg-avatar">👤</div>
    <div class="msg-content">
      <div class="msg-meta">
        <span class="msg-name">You</span>
        <span class="msg-time">${now()}</span>
      </div>
      <div class="msg-bubble">${esc(text)}</div>
    </div>`;
  area.appendChild(div);
  scrollBottom(area);
}

// ── RENDER: BOT BUBBLE ────────────────────────────────────────────────────
function renderBotBubble(text, topic, relevantFAQs, confidence) {
  const area   = document.getElementById('messagesArea');
  const id     = 'msg_' + Date.now();
  const bClass = 'badge-' + (topic || 'General').replace(/\s.*/, '');

  // Follow-up chips (from same topic, not the already-answered intent)
  const topicFAQs = faqData.filter(f => f.topic === topic);
  const chips = topicFAQs
    .slice(0, 3)
    .map(f => f.questions.split('/')[0].trim())
    .filter(Boolean);

  const chipsHTML = chips.length && topic !== 'General'
    ? `<div class="suggestions">${chips.map(c => `<span class="chip" onclick="askQuestion('${esc(c)}')">${esc(c)}</span>`).join('')}</div>`
    : '';

  // Sources list
  const sourcesHTML = relevantFAQs.length > 0
    ? `<div class="msg-sources">
        <div class="sources-label">📌 Sources used</div>
        ${relevantFAQs.slice(0,3).map(f => `<span class="source-chip">📄 ${esc(f.intent)}</span>`).join('')}
       </div>`
    : '';

  // Confidence bar
  const confHTML = confidence > 0
    ? `<div class="confidence-row">
        <span class="confidence-label">Match confidence</span>
        <div class="confidence-bar"><div class="confidence-fill" style="width:0%" data-target="${confidence}%"></div></div>
        <span class="confidence-label">${confidence}%</span>
       </div>`
    : '';

  const div = document.createElement('div');
  div.className = 'message bot';
  div.id = id;
  div.innerHTML = `
    <div class="msg-avatar">🎓</div>
    <div class="msg-content">
      <div class="msg-meta">
        <span class="msg-name">CampusBot</span>
        <span class="msg-time">${now()}</span>
      </div>
      <div class="msg-bubble">
        <span class="intent-badge ${bClass}">${esc(topic || 'General')}</span><br>
        ${esc(text)}
        ${sourcesHTML}
        ${confHTML}
        ${chipsHTML}
      </div>
      <div class="feedback-row">
        <button class="feedback-btn" id="up_${id}" onclick="giveFeedback('${id}', true)">👍 Helpful</button>
        <button class="feedback-btn" id="dn_${id}" onclick="giveFeedback('${id}', false)">👎 Not helpful</button>
      </div>
    </div>`;
  area.appendChild(div);
  scrollBottom(area);

  // Animate confidence bar
  requestAnimationFrame(() => {
    const fill = div.querySelector('.confidence-fill');
    if (fill) {
      setTimeout(() => { fill.style.width = fill.dataset.target; }, 200);
    }
  });
}

// ── TYPING ────────────────────────────────────────────────────────────────
function showTyping() {
  document.getElementById('typingRow').style.display = 'flex';
  const area = document.getElementById('messagesArea');
  scrollBottom(area);
}
function hideTyping() {
  document.getElementById('typingRow').style.display = 'none';
}

// ── FEEDBACK ─────────────────────────────────────────────────────────────
function giveFeedback(msgId, positive) {
  const up = document.getElementById('up_' + msgId);
  const dn = document.getElementById('dn_' + msgId);
  if (!up || up.disabled) return;
  up.disabled = true; dn.disabled = true;
  up.classList.toggle('active-pos', positive);
  dn.classList.toggle('active-neg', !positive);
  totalFeedback++;
  if (positive) positiveFeedback++;

  const lastLog = queryLogs[queryLogs.length - 1];
  if (lastLog) lastLog.feedback = positive ? '👍' : '👎';
  refreshLogTable();
  updateStats();
  showToast(positive ? '✓ Thanks for the feedback!' : '✓ Feedback noted — we\'ll improve!');
}

// ── LOGS ──────────────────────────────────────────────────────────────────
function addToLog(query, topic, answered) {
  queryCount++;
  if (answered) answeredCount++;
  queryLogs.push({ time: now(), query, topic, answered, feedback: '—' });
  document.getElementById('logCount').textContent = queryLogs.length;
  document.getElementById('logEmpty').style.display = queryLogs.length ? 'none' : 'block';
  refreshLogTable();
}

function refreshLogTable() {
  const tbody = document.getElementById('logBody');
  tbody.innerHTML = '';
  [...queryLogs].reverse().forEach(log => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${log.time}</td>
      <td title="${esc(log.query)}">${esc(log.query.slice(0, 45))}${log.query.length > 45 ? '…' : ''}</td>
      <td>${esc(log.topic)}</td>
      <td>${log.answered
        ? '<span class="log-answered">✅ Answered</span>'
        : '<span class="log-unanswered">⚠ Logged</span>'}</td>
      <td>${log.feedback}</td>`;
    tbody.appendChild(tr);
  });
}

function exportLogs() {
  if (!queryLogs.length) { showToast('No logs to export yet!', 'error'); return; }
  const header = ['Time', 'Query', 'Topic', 'Status', 'Feedback'];
  const rows = queryLogs.map(l => [
    l.time,
    `"${l.query.replace(/"/g, '""')}"`,
    l.topic,
    l.answered ? 'Answered' : 'Unanswered',
    l.feedback
  ]);
  const csv = [header, ...rows].map(r => r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'campusbot_logs.csv';
  a.click();
  showToast('✓ Logs exported!');
}

function openLogs()  { document.getElementById('logsModal').classList.add('open'); }
function closeLogs() { document.getElementById('logsModal').classList.remove('open'); }
function closeLogsOutside(e) { if (e.target.id === 'logsModal') closeLogs(); }

// ── STATS ─────────────────────────────────────────────────────────────────
function updateStats() {
  document.getElementById('queryStat').textContent = queryCount;
  document.getElementById('answeredStat').textContent = answeredCount;
  const sat = totalFeedback > 0
    ? Math.round((positiveFeedback / totalFeedback) * 100) + '%'
    : '—';
  document.getElementById('satisfactionStat').textContent = sat;
}

function updateLastQuery(q) {
  const el = document.getElementById('lastQueryBox');
  if (el) el.textContent = `"${q}"`;
}

// ── COVERAGE BARS ─────────────────────────────────────────────────────────
function buildCoverageBars() {
  const container = document.getElementById('coverageBars');
  if (!container) return;
  const topicColors = {
    'Admissions':        '#10b981',
    'Academics':         '#6366f1',
    'Campus Facilities': '#f59e0b',
    'Events & Life':     '#ec4899',
    'Contacts':          '#8b5cf6',
  };
  const total = faqData.length;
  const topics = TOPICS.filter(t => t.key !== 'all');
  container.innerHTML = topics.map(t => {
    const count = faqData.filter(f => f.topic === t.key).length;
    const pct = Math.round((count / total) * 100);
    const color = topicColors[t.key] || '#6366f1';
    return `
      <div class="coverage-item">
        <div class="coverage-meta">
          <span class="coverage-name">${t.icon} ${t.label.replace(' Facilities', '')}</span>
          <span class="coverage-pct">${count} FAQs</span>
        </div>
        <div class="coverage-track">
          <div class="coverage-fill" style="width:0%; background:${color}" data-target="${pct}%"></div>
        </div>
      </div>`;
  }).join('');

  // Animate fills
  requestAnimationFrame(() => {
    setTimeout(() => {
      container.querySelectorAll('.coverage-fill').forEach(el => {
        el.style.transition = 'width 1s cubic-bezier(0.16,1,0.3,1)';
        el.style.width = el.dataset.target;
      });
    }, 300);
  });
}

// ── TOPIC SIDEBAR ─────────────────────────────────────────────────────────
function buildTopicSidebar() {
  const nav = document.getElementById('topicList');
  if (!nav) return;
  nav.innerHTML = '';
  TOPICS.forEach(t => {
    const count = t.key === 'all' ? faqData.length : faqData.filter(f => f.topic === t.key).length;
    const btn = document.createElement('button');
    btn.className = 'topic-btn' + (t.key === activeTopicFilter ? ' active' : '');
    btn.dataset.topicKey = t.key;
    btn.innerHTML = `
      <span class="topic-icon">${t.icon}</span>
      <span class="topic-label">${t.label}</span>
      <span class="topic-count">${count}</span>`;

    btn.addEventListener('click', () => {
      activeTopicFilter = t.key;
      buildTopicSidebar();
      if (t.key !== 'all') {
        openTopicPanel(t);
      } else {
        closeTopicPanel();
      }
    });

    nav.appendChild(btn);
  });
}

// ── TOPIC QUESTIONS PANEL ────────────────────────────────────────────────
function openTopicPanel(topic) {
  const panel = document.getElementById('topicQuestionsPanel');
  const title = document.getElementById('tqpTitle');
  const list  = document.getElementById('tqpList');

  title.textContent = `${topic.icon} ${topic.label}`;

  const entries = faqData.filter(f => f.topic === topic.key);
  list.innerHTML = entries.map(f => {
    const firstQ = f.questions.split('/')[0].trim();
    return `
      <div class="tqp-question" onclick="askQuestion('${esc(firstQ)}')">
        <span class="tqp-q-icon">→</span>
        <span>${esc(firstQ)}</span>
      </div>`;
  }).join('');

  panel.classList.add('open');
}

function closeTopicPanel() {
  document.getElementById('topicQuestionsPanel').classList.remove('open');
  activeTopicFilter = 'all';
  buildTopicSidebar();
}

// ── WELCOME SCREEN ────────────────────────────────────────────────────────
function buildWelcomeScreen() {
  buildTopicCardsGrid();
  buildQuickAsks();
}

function buildTopicCardsGrid() {
  const grid = document.getElementById('topicCardsGrid');
  if (!grid) return;
  const topics = TOPICS.filter(t => t.key !== 'all');
  grid.innerHTML = topics.map(t => {
    const count = faqData.filter(f => f.topic === t.key).length;
    return `
      <div class="topic-card" onclick="openTopicFromCard('${t.key}')">
        <span class="tc-arrow">›</span>
        <span class="tc-icon">${t.icon}</span>
        <span class="tc-name">${t.label}</span>
        <span class="tc-count">${count} FAQs</span>
      </div>`;
  }).join('');
}

function openTopicFromCard(key) {
  const topic = TOPICS.find(t => t.key === key);
  if (topic) {
    activeTopicFilter = key;
    buildTopicSidebar();
    openTopicPanel(topic);
  }
}

function buildQuickAsks() {
  const container = document.getElementById('quickAsks');
  if (!container) return;
  const samples = [
    { q: 'What are the hostel timings?',          icon: '🏠' },
    { q: 'What is the eligibility for B.Tech?',   icon: '🎓' },
    { q: 'When are the final exams?',              icon: '📅' },
    { q: 'How do I connect to campus WiFi?',       icon: '📶' },
    { q: 'When is the annual tech fest?',          icon: '💻' },
    { q: 'How to report ragging?',                 icon: '🛡️' },
  ];
  container.innerHTML = samples.map(s =>
    `<div class="quick-ask-pill" onclick="askQuestion('${esc(s.q)}')">${s.icon} ${esc(s.q)}</div>`
  ).join('');
}

// ── NEW CHAT ──────────────────────────────────────────────────────────────
function newChat() {
  conversationHistory = [];
  const area = document.getElementById('messagesArea');
  area.innerHTML = `
    <div class="welcome-screen" id="welcomeScreen">
      <div class="welcome-hero">
        <div class="hero-badge">AI-Powered · RAG Architecture</div>
        <h1 class="hero-title">Hello! I'm <em>CampusBot</em> 👋</h1>
        <p class="hero-subtitle">Your intelligent college assistant. Ask me anything about admissions, academics, campus life, or contacts — I answer from real data.</p>
      </div>
      <div class="topic-cards-grid" id="topicCardsGrid"></div>
      <div class="welcome-divider"><span>or ask directly</span></div>
      <div class="quick-asks" id="quickAsks"></div>
    </div>`;
  buildWelcomeScreen();
  hideTyping();
  showToast('✓ New conversation started');
}

// ── SEARCH ────────────────────────────────────────────────────────────────
function initSearch() {
  const pill = document.getElementById('globalSearch');
  if (pill) pill.addEventListener('click', openSearch);
}

function initKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openSearch();
    }
    if (e.key === 'Escape') {
      closeSearch();
      closeLogs();
    }
  });
}

function openSearch() {
  document.getElementById('searchOverlay').classList.add('open');
  setTimeout(() => document.getElementById('searchInput')?.focus(), 100);
}

function closeSearch() {
  document.getElementById('searchOverlay').classList.remove('open');
}

function closeSearchOutside(e) {
  if (e.target.id === 'searchOverlay') closeSearch();
}

function handleSearch(query) {
  const container = document.getElementById('searchResults');
  if (!query.trim()) {
    container.innerHTML = '<div class="search-empty">Start typing to search across all 50 FAQs...</div>';
    return;
  }

  const results = retrieveRelevantFAQs(query, 8);
  if (!results.length) {
    container.innerHTML = '<div class="search-empty">No matching FAQs found. Try different keywords.</div>';
    return;
  }

  container.innerHTML = results.map(f => {
    const bClass = 'badge-' + f.topic.replace(/\s.*/, '');
    const firstQ = f.questions.split('/')[0].trim();
    return `
      <div class="search-result-item" onclick="selectSearchResult('${esc(firstQ)}')">
        <span class="intent-badge ${bClass} sri-badge">${esc(f.topic)}</span>
        <div class="sri-text">
          <div class="sri-q">${esc(firstQ)}</div>
          <div class="sri-a">${esc(f.answer)}</div>
        </div>
      </div>`;
  }).join('');
}

function selectSearchResult(q) {
  closeSearch();
  askQuestion(q);
}

// ── API KEY ───────────────────────────────────────────────────────────────
function saveApiKey() {
  const val = document.getElementById('apiKeyInput').value.trim();
  if (!val) { showToast('Please enter a valid API key', 'error'); return; }
  apiKey = val;
  localStorage.setItem('gemini_api_key', val);
  document.getElementById('apiSection')?.classList.add('hidden');
  showToast('✓ Gemini API key saved — AI is now active!', 'success');
}

// ── UTILITIES ────────────────────────────────────────────────────────────
function handleKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function scrollBottom(el) {
  requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
}

function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function esc(t) {
  return String(t)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

function showToast(msg, type = 'default') {
  const existing = document.querySelectorAll('.toast');
  existing.forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = `toast${type === 'success' ? ' toast-success' : type === 'error' ? ' toast-error' : ''}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.animation = 'toastIn 0.25s reverse both';
    setTimeout(() => t.remove(), 250);
  }, 2800);
}