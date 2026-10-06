
// Iyanu WhatsApp Dream Diagnostic Bot - Netlify Function + WhatsApp Cloud API + Gemini 2.0 Flash
// Uses Iyanu_Dictionary_Enriched_Fixed.json (105 symbols) + 13-step prompt
// Deploy as Netlify Function: netlify/functions/whatsapp.js

const SYMBOL_DATABASE = require('./Iyanu_Dictionary_Enriched_Fixed.json');
const SPIRITUAL_LAWS = require('./Iyanu_SPIRITUAL_LAWS_10.json');

const GEMINI_MODEL = "gemini-2.0-flash";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "iyanu_verify_2025";

// --- STATE MANAGEMENT (use Redis/DB in production, in-memory for demo) ---
const sessions = new Map(); // key = wa_id, value = { step, data: {title, narrative, context, emotion}, lastActive }

// --- 13-STEP GEMINI PROMPT (from your original site) ---
function buildDiagnosticPrompt(title, content, context, emotion) {
  return `You are the theological AI engine of Iyanu Dream Diagnostics — a reflective Christian dream-study tool.
Theological Guidelines & Methodology:
1. Hermeneutic of Law of First Mention: Examine the first time key symbols appear in the KJV Bible (primarily Genesis) as foundational patterns, while recognizing NT fulfillment in Christ.
2. African Deliverance Guidance: Address spiritual warfare themes common in African Pentecostal and deliverance traditions (altars, covenants, ancestral limitations, marine/water spirits discernment, spiritual spouses, household authority, legal rights).
3. Rigorous Theological Distinction: Clearly distinguish explicit KJV scripture from deliverance tradition frameworks. Explain that while KJV reveals God's sovereignty over the deep and chaos (Gen 1:2, Ps 74, Mark 4:39), concepts like 'marine spirits' or 'spirit spouses' belong to deliverance interpretive models rather than dogmatic Bible verses.
4. Jane Hamon Prophetic Categories: Categorize dreams as Warning, Direction, Encouragement, Valley, Corporate, or False/Test. Emphasize that a Warning dream can be overturned through intercessory prayer!
5. Safety Guardrail: NEVER predict literal physical death, tragedy, or fatalism. This is a devotional reflection tool, not a medical, psychological, or infallible pastoral diagnosis.

DREAM TITLE: ${title}
DREAM NARRATIVE: "${content}"
PERSONAL WAKING CONTEXT: "${context || 'General reflection'}"
EMOTIONAL TONE: ${emotion || 'Unspecified'}

Output your response strictly in the 13-step Iyanu Dream Diagnostics Protocol formatted as:
=== STEP 1: What Appeared ===
=== STEP 2: KJV Law of First Mention Evidence ===
=== STEP 3: Biblical Meanings ===
=== STEP 4: Contextual Actions & Relational Matrix ===
=== STEP 5: Biblical Parallels ===
=== STEP 6: Emotional & Natural Discernment ===
=== STEP 7: Jane Hamon Prophetic Category ===
=== STEP 8 & 9: Iyanu Spiritual Laws & African Deliverance Guidance ===
=== STEP 10: Key Scripture References ===
=== STEP 11: Rhema R.I.A. Workflow ===
=== STEP 12: Warfare Prayer & Scripture Decrees ===
=== STEP 13: Action Steps & Safety Guidance ===`;
}

// --- OFFLINE SYMBOL DETECTION (Fallback) ---
function detectSymbols(text) {
  const lower = text.toLowerCase();
  return Object.entries(SYMBOL_DATABASE).filter(([id, entry]) => {
    const labelMatch = lower.includes(entry.label.toLowerCase());
    const keywordMatch = entry.keywords && entry.keywords.some(k => lower.includes(k.toLowerCase()));
    return labelMatch || keywordMatch;
  }).map(([id, entry]) => ({ id, ...entry })).slice(0, 5);
}

function generateLocalReport(title, content, context, emotion) {
  const matched = detectSymbols(content);
  const primaryLaw = matched[0]?.spiritualLaws?.[0] || SPIRITUAL_LAWS[0];
  const hamonCat = matched[0]?.hamonCategory?.[0] || (emotion && emotion.toLowerCase().includes('fear') ? 'Warning' : 'Direction & Encouragement');
  
  let step2 = matched.length > 0 ? matched.map(s => `• ${s.label}: First Mention: ${s.firstMention.ref} — "${s.firstMention.text}"`).join('\n\n') : "• Genesis 1:1-3 — God brings light over chaos";
  let step3 = matched.length > 0 ? matched.map(s => `• ${s.label}: Positive: ${s.meanings.positive}\n  Warning: ${s.meanings.negative}`).join('\n\n') : "Biblical symbolism evaluated through covenant lens";
  
  return `=== STEP 1: What Appeared ===
• Dream: "${content}"\n• Context: "${context}"\n• Emotion: ${emotion}

=== STEP 2: KJV Law of First Mention Evidence ===
${step2}

=== STEP 3: Biblical Meanings ===
${step3}

=== STEP 4: Contextual Actions & Relational Matrix ===
Movement upward = elevation, descending/running in panic = foundational alert.

=== STEP 5: Biblical Parallels ===
• Joseph (Gen 37,41) — divine timing\n• Peter (Acts 10) — breakthrough\n• Daniel (Dan 2,7) — sovereignty

=== STEP 6: Emotional & Natural Discernment ===
Emotion: ${emotion}. Peace is umpire (Col 3:15). 2 Tim 1:7 — no spirit of fear.

=== STEP 7: Jane Hamon Prophetic Category ===
Category: ${hamonCat}. Warning dreams can be overturned by prayer!

=== STEP 8 & 9: Iyanu Spiritual Laws & African Deliverance Guidance ===
Law: ${primaryLaw.name}\nScripture: ${primaryLaw.scripture}\nInsight: ${primaryLaw.meaning}\nAction: ${primaryLaw.deliveranceAction}

=== STEP 10: Key Scripture References ===
• Psalm 91:5-7 (Protection)\n• Luke 10:19 (Authority)\n• Col 2:14-15 (Blotting ordinances)

=== STEP 11: Rhema R.I.A. Workflow ===
Revelation: Recorded narrative\nInterpretation: First Mention + Atonement\nApplication: Warfare prayers

=== STEP 12: Warfare Prayer & Scripture Decrees ===
Father, in Jesus name, I bring this vision before Your throne. If direction, I receive it. If ambush, I cancel by Blood (Col 2:14-15). I decree Luke 10:19 and Isa 54:17 — no weapon shall prosper. Amen!

=== STEP 13: Action Steps & Safety Guidance ===
1. Log in Iyanu Journal\n2. Meditate on scriptures\n3. Take authority over sleep atmosphere\n4. Safeguard: Devotional tool, not infallible prophecy. Speak faith, not fear.`;
}

function parseSteps(rawText) {
  const lines = rawText.split('\n');
  const steps = [];
  let current = null;
  let content = [];
  lines.forEach(line => {
    const headerMatch = line.match(/^=+\s*STEP\s*([0-9& ]+):\s*(.*?)\s*=+$/i) || line.match(/^STEP\s*([0-9& ]+):\s*(.*)/i);
    if (headerMatch) {
      if (current) {
        current.content = content.join('\n').trim();
        steps.push(current);
        content = [];
      }
      current = { stepNumber: headerMatch[1].trim(), title: headerMatch[2].replace(/=+/g,'').trim(), content: "" };
    } else if (current) {
      content.push(line);
    }
  });
  if (current) {
    current.content = content.join('\n').trim();
    steps.push(current);
  }
  return steps;
}

async function callGemini(prompt) {
  if (!GEMINI_API_KEY) return null;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    if (!res.ok) {
      console.warn("Gemini failed", await res.text());
      return null;
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (e) {
    console.warn("Gemini error", e);
    return null;
  }
}

// --- WHATSAPP SENDERS ---
async function sendWhatsAppMessage(to, text) {
  // WhatsApp Cloud API max 4096 chars, split if needed
  const chunks = text.match(/[\s\S]{1,4000}/g) || [text];
  for (const chunk of chunks) {
    await fetch(`https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: chunk, preview_url: false }
      })
    });
  }
}

async function sendInteractiveButtons(to, bodyText, buttons) {
  // buttons: [{id, title}]
  await fetch(`https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_ID}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: bodyText },
        action: { buttons: buttons.map(b => ({ type: "reply", reply: { id: b.id, title: b.title } })) }
      }
    })
  });
}

async function sendListMessage(to, bodyText, buttonText, sections) {
  await fetch(`https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_ID}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "list",
        body: { text: bodyText },
        action: { button: buttonText, sections }
      }
    })
  });
}

// --- MAIN FLOW ---
async function handleUserMessage(from, messageText, buttonId = null) {
  const input = (buttonId || messageText || "").trim();
  const lower = input.toLowerCase();

  let session = sessions.get(from);
  if (!session) {
    session = { step: "WELCOME", data: { title: "", narrative: "", context: "", emotion: "" } };
    sessions.set(from, session);
  }

  // Global commands
  if (["hi", "hello", "start", "dream", "iyanu"].includes(lower) || lower.includes("interpret")) {
    session.step = "ASK_TITLE";
    session.data = { title: "", narrative: "", context: "", emotion: "" };
    await sendWhatsAppMessage(from, `🌙 *Welcome to Iyanu Dream Diagnostics* — Biblical Dream Exegesis & Deliverance\n\nI am your Iyanu Spiritual Mentor (Gemini 2.0 Flash + 105 KJV symbols).\n\nLet's discern your dream in 4 quick steps.\n\n*What would you title your dream?* (e.g., "Snake in my father's house")`);
    return;
  }

  if (lower === "reset" || lower === "cancel") {
    sessions.delete(from);
    await sendWhatsAppMessage(from, "Session reset. Type *hi* to start a new dream diagnosis.");
    return;
  }

  switch (session.step) {
    case "ASK_TITLE":
      session.data.title = input;
      session.step = "ASK_NARRATIVE";
      await sendWhatsAppMessage(from, `✓ Title: *${input}*\n\n*Step 2/4 — Describe your dream in detail:*\nWhat did you see? Who was there? What happened? Include symbols: serpent, water, house, eating, etc.\n\nType your full narrative (2-5 sentences).`);
      break;

    case "ASK_NARRATIVE":
      if (input.length < 15) {
        await sendWhatsAppMessage(from, "Please share a bit more detail (at least 2 sentences) so I can detect biblical symbols accurately.");
        return;
      }
      session.data.narrative = input;
      const detected = detectSymbols(input);
      let detectedText = "";
      if (detected.length > 0) {
        detectedText = `\n🔍 *Auto-detected biblical symbols:* ${detected.map(d => d.label).join(", ")}\n`;
      }
      session.step = "ASK_CONTEXT";
      await sendWhatsAppMessage(from, `✓ Narrative saved.${detectedText}\n*Step 3/4 — Waking context / Life season:*\nWhat is happening in your life right now? (e.g., job transition, marriage, waiting season, spiritual warfare)\n\nType your context or type *skip*.`);
      break;

    case "ASK_CONTEXT":
      session.data.context = input.toLowerCase() === "skip" ? "General reflection" : input;
      session.step = "ASK_EMOTION";
      await sendWhatsAppMessage(from, `✓ Context saved.\n\n*Step 4/4 — How did you feel upon waking?*\nSelect by typing the number:\n1. Peaceful / Encouraged\n2. Fear / Troubled\n3. Confused / Heavy\n4. Excited / Expectant`);
      // [REMOVED BUTTONS FOR FREE TIER COMPLIANCE] /*
      */
      break;

    case "ASK_EMOTION":
      let emotion = input;
      if (buttonId) {
        if (buttonId.includes("peace")) emotion = "Peaceful / Encouraged";
        if (buttonId.includes("fear")) emotion = "Fear / Troubled";
        if (buttonId.includes("confused")) emotion = "Confused / Heavy";
      }
      session.data.emotion = emotion;
      session.step = "DIAGNOSING";
      await sendWhatsAppMessage(from, `✓ Emotion: *${emotion}*\n\n🔬 *Running 13-Step Iyanu Diagnostics...*\n• KJV Law of First Mention\n• Jane Hamon Prophetic Category\n• 10 Spiritual Laws\n• Warfare decrees\n\nPlease wait 10-15 seconds...`);
      
      // Build prompt and call Gemini or fallback
      const prompt = buildDiagnosticPrompt(session.data.title, session.data.narrative, session.data.context, session.data.emotion);
      let rawReport = await callGemini(prompt);
      let isOffline = false;
      if (!rawReport) {
        rawReport = generateLocalReport(session.data.title, session.data.narrative, session.data.context, session.data.emotion);
        isOffline = true;
      }
      const steps = parseSteps(rawReport);
      
      // Send report in chunks - WhatsApp friendly
      await sendWhatsAppMessage(from, `📜 *IYANU DREAM REPORT*\n*${session.data.title}*\n${new Date().toLocaleDateString()} • 13-Step Protocol${isOffline ? ' • Offline Synthesis' : ' • Gemini 2.0 Flash'}`);

      // Send steps 1-4 as one message, 5-7, 8-10, 11-13 separately to avoid spam
      const chunkGroups = [
        steps.slice(0,4),
        steps.slice(4,8),
        steps.slice(8,11),
        steps.slice(11,13)
      ];

      for (const group of chunkGroups) {
        if (group.length === 0) continue;
        let msg = "";
        for (const s of group) {
          msg += `*STEP ${s.stepNumber}: ${s.title.toUpperCase()}*\n${s.content}\n\n`;
        }
        await sendWhatsAppMessage(from, msg.trim());
        await new Promise(r => setTimeout(r, 800)); // slight delay to preserve order
      }

      // Final call to action
      await sendWhatsAppMessage(from, `✅ Diagnosis complete.\n\n⚠️ *Safeguard:* This is devotional reflection, not infallible prophecy. Speak faith, not fear. Col 2:14-15.\n\nWhat would you like to do next? Type the number:\n1. Save to Journal\n2. Get Daily Decree (Luke 10:19)\n3. New Dream\n4. Bible Study Pack`);

      session.step = "COMPLETE";
      session.data.lastReport = rawReport;
      session.data.steps = steps;
      break;

    case "COMPLETE":
      if (buttonId === "action_new" || lower.includes("new dream")) {
        session.step = "ASK_TITLE";
        session.data = { title: "", narrative: "", context: "", emotion: "" };
        await sendWhatsAppMessage(from, `Let's start a new one.\n\n*What would you title your next dream?*`);
      } else if (buttonId === "action_journal" || lower.includes("journal")) {
        await sendWhatsAppMessage(from, `📔 Saved! (In production this would save to your Iyanu Dream Journal at iyanudiagnostics.netlify.app)\n\nType *new* to interpret another dream or *decree* for warfare prayers.`);
      } else if (buttonId === "action_decree" || lower.includes("decree")) {
        const decree = `🔥 *Today's Warfare Decree (Luke 10:19)*\n"By the blood of the Lamb, I tread upon every nocturnal serpent and demonic scorpion deployed against my destiny in Jesus' name! No weapon formed against me shall prosper (Isa 54:17). I am seated with Christ in heavenly places (Eph 2:6). Amen!"`;
        await sendWhatsAppMessage(from, decree);
      } else {
        await sendWhatsAppMessage(from, `Type *hi* or *new* to start a new dream, or *decree* for warfare prayers.\n\nExplore full dictionary: https://iyanudiagnostics.netlify.app/iyanu_dream`);
      }
      break;

    default:
      sessions.delete(from);
      await sendWhatsAppMessage(from, "Session reset. Type *hi* to start.");
  }
}

// --- NETLIFY HANDLER ---
exports.handler = async (event) => {
  // Verification for WhatsApp webhook setup
  if (event.httpMethod === "GET") {
    const params = event.queryStringParameters || {};
    if (params['hub.mode'] === 'subscribe' && params['hub.verify_token'] === VERIFY_TOKEN) {
      return { statusCode: 200, body: params['hub.challenge'] };
    }
    return { statusCode: 403, body: "Forbidden" };
  }

  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body);
      // WhatsApp Cloud API structure
      if (body.object === "whatsapp_business_account") {
        for (const entry of body.entry || []) {
          for (const change of entry.changes || []) {
            const value = change.value;
            if (value.messages) {
              for (const msg of value.messages) {
                const from = msg.from; // wa_id
                let text = "";
                let buttonId = null;
                if (msg.type === "text") text = msg.text.body;
                if (msg.type === "interactive") {
                  if (msg.interactive.type === "button_reply") {
                    buttonId = msg.interactive.button_reply.id;
                    text = msg.interactive.button_reply.title;
                  }
                  if (msg.interactive.type === "list_reply") {
                    buttonId = msg.interactive.list_reply.id;
                    text = msg.interactive.list_reply.title;
                  }
                }
                await handleUserMessage(from, text, buttonId);
              }
            }
          }
        }
      }
      return { statusCode: 200, body: "EVENT_RECEIVED" };
    } catch (e) {
      console.error(e);
      return { statusCode: 500, body: e.toString() };
    }
  }

  return { statusCode: 405, body: "Method Not Allowed" };
};

// FREE TIER COMPLIANT VERSION - No interactive buttons, plain text numbered lists only
// Use this for WhatsApp Business App free version
