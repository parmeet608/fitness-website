const form = document.getElementById("plan-form");
const resultSection = document.getElementById("result");
const planOutput = document.getElementById("plan-output");
const nutritionOutput = document.getElementById("nutrition-output");
const prevStepBtn = document.getElementById("prev-step");
const nextStepBtn = document.getElementById("next-step");
const generateBtn = document.getElementById("generate-btn");
const stepChips = [...document.querySelectorAll(".step-chip")];
const formSteps = [...document.querySelectorAll(".form-step")];
const tabButtons = [...document.querySelectorAll(".tab-btn")];
const tabPanels = [...document.querySelectorAll(".tab-panel")];
const downloadPdfBtn = document.getElementById("download-pdf");
const sendEmailBtn = document.getElementById("send-email");
const emailInput = document.getElementById("email-input");
const emailStatus = document.getElementById("email-status");
const devFillBtn = document.getElementById("dev-fill-test");

const EMAILJS_PUBLIC_KEY = "vEQNXStWhw-dwHodm";
const EMAILJS_SERVICE_ID = "service_b5egokl";
const EMAILJS_TEMPLATE_ID = "template_qb0jl76";

let currentStep = 1;
let latestPlanText = "";
let latestNutritionText = "";

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function cleanBullet(line) {
  return line.replace(/^[-*•]\s*/, "").replace(/^\d+[\.\)]\s*/, "").trim();
}

const SECTION_ORDER = [
  { pattern: /profile\s*snapshot/i, title: "Profile Snapshot" },
  { pattern: /weekly\s*split/i, title: "Weekly Split" },
  { pattern: /day[\s-]*by[\s-]*day/i, title: "Day-by-Day Plan" },
  { pattern: /4[\s-]*week|progression/i, title: "4-Week Progression" },
  { pattern: /recommend|caution|personalized/i, title: "Recommendations & Cautions" }
];

const WEEKDAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const DAY_SUBSECTION_LABELS = [
  { pattern: /^warm[\s-]?up/i, label: "Warm-up" },
  { pattern: /^main(\s+work|\s+session|\s+lifts?)?$/i, label: "Main Workout" },
  { pattern: /^cool[\s-]?down/i, label: "Cooldown" },
  { pattern: /^exercises?$/i, label: "Exercises" },
  { pattern: /^finisher$/i, label: "Finisher" },
  { pattern: /^notes?$/i, label: "Notes" }
];

function isSectionHeader(line) {
  return (
    /^\[SECTION:\s*.+\]$/i.test(line) ||
    /^(?:#{1,3}\s*)?\d+[\.\)]\s+\S/.test(line) ||
    /^(?:#{1,3}\s+)(Profile Snapshot|Weekly Split|Day[\s-]*by[\s-]*Day|4[\s-]*Week|Progression|Recommendations|Cautions)/i.test(line)
  );
}

function parseSectionTitle(line) {
  const bracket = line.match(/^\[SECTION:\s*(.+)\]$/i);
  if (bracket) return bracket[1].trim();
  const numbered = line.match(/^(?:#{1,3}\s*)?\d+[\.\)]\s*(.+)$/);
  if (numbered) return numbered[1].replace(/^#+\s*/, "").trim();
  const markdown = line.match(/^#{1,3}\s+(.+)$/);
  if (markdown) return markdown[1].trim();
  return line.replace(/^#+\s*/, "").trim();
}

function canonicalSectionTitle(title) {
  const match = SECTION_ORDER.find((s) => s.pattern.test(title));
  return match ? match.title : title;
}

function sectionSortIndex(title) {
  const idx = SECTION_ORDER.findIndex((s) => s.pattern.test(title));
  return idx === -1 ? SECTION_ORDER.length : idx;
}

function getSections(planText) {
  const lines = planText.split("\n").map((l) => l.trim()).filter(Boolean);
  const sections = [];
  let current = null;

  lines.forEach((line) => {
    if (isSectionHeader(line)) {
      current = { title: parseSectionTitle(line), lines: [] };
      sections.push(current);
      return;
    }
    if (!current) {
      current = { title: "Workout Plan", lines: [] };
      sections.push(current);
    }
    current.lines.push(line);
  });

  const normalized = (sections.length ? sections : [{ title: "Workout Plan", lines }]).map((s) => ({
    title: canonicalSectionTitle(s.title),
    lines: s.lines
  }));

  return normalized.sort((a, b) => sectionSortIndex(a.title) - sectionSortIndex(b.title));
}

function getDaySortKey(title) {
  const dayNum = title.match(/\bday\s*(\d+)\b/i);
  if (dayNum) return Number(dayNum[1]);
  const lower = title.toLowerCase();
  const weekday = WEEKDAY_ORDER.findIndex((d) => lower.includes(d));
  if (weekday >= 0) return weekday + 1;
  return 100;
}

function isDayHeader(line) {
  return (
    /^\[DAY:\s*.+\]$/i.test(line) ||
    /^(?:#{2,4}\s*)?(day\s*\d+|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(line)
  );
}

function parseDayTitle(line) {
  const bracket = line.match(/^\[DAY:\s*(.+)\]$/i);
  if (bracket) return bracket[1].trim();
  return line.replace(/^#{1,4}\s*/, "").replace(/^[-*•]\s*/, "").trim();
}

function matchSubsection(line) {
  const cleaned = line.replace(/^[-*•#]+\s*/, "").replace(/\*+/g, "").trim();
  const colonSplit = cleaned.match(/^([^:]{2,40}):\s*(.*)$/);
  const labelSource = colonSplit ? colonSplit[1] : cleaned;
  const inlineBody = colonSplit ? colonSplit[2].trim() : "";
  const match = DAY_SUBSECTION_LABELS.find((s) => s.pattern.test(labelSource));
  if (!match) return null;
  return { label: match.label, inlineBody };
}

function parseDayBlocks(lines) {
  const days = [];
  let currentDay = null;
  let currentBlock = null;

  const pushBlockLine = (text) => {
    if (!text) return;
    if (!currentBlock) {
      currentBlock = { label: "Exercises", items: [] };
      currentDay.blocks.push(currentBlock);
    }
    currentBlock.items.push(text);
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) return;

    if (isDayHeader(line)) {
      currentDay = { title: parseDayTitle(line), blocks: [] };
      days.push(currentDay);
      currentBlock = null;
      return;
    }

    if (!currentDay) {
      currentDay = { title: `Day ${days.length + 1}`, blocks: [] };
      days.push(currentDay);
    }

    const subsection = matchSubsection(line);
    if (subsection) {
      currentBlock = { label: subsection.label, items: [] };
      currentDay.blocks.push(currentBlock);
      if (subsection.inlineBody) pushBlockLine(subsection.inlineBody);
      return;
    }

    if (/^[-*•]\s+/.test(line) || /^\d+[\.\)]\s+/.test(line)) {
      pushBlockLine(cleanBullet(line));
      return;
    }

    pushBlockLine(line);
  });

  return days.sort((a, b) => getDaySortKey(a.title) - getDaySortKey(b.title));
}

function renderLinesAsContent(lines) {
  const bullets = [];
  const paragraphs = [];

  lines.forEach((line) => {
    if (/^[-*•]\s+/.test(line) || /^\d+[\.\)]\s+/.test(line)) {
      bullets.push(cleanBullet(line));
    } else {
      paragraphs.push(line);
    }
  });

  const parts = [];
  if (paragraphs.length) {
    parts.push(`<p class="section-body">${escapeHtml(paragraphs.join(" "))}</p>`);
  }
  if (bullets.length) {
    parts.push(`<ul class="section-list">${bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>`);
  }
  return parts.join("") || `<p class="section-body muted">No details provided.</p>`;
}

function renderDayCards(lines) {
  const days = parseDayBlocks(lines);
  if (!days.length) return renderLinesAsContent(lines);

  const cards = days.map((day, index) => {
    const blocks = day.blocks.length
      ? day.blocks
      : [{ label: "Workout", items: ["See plan details above."] }];

    const blocksHtml = blocks.map((block) => {
      const items = block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
      return `
        <div class="day-block">
          <h5 class="day-block__title">${escapeHtml(block.label)}</h5>
          <ul class="day-block__list">${items || "<li>Details not provided.</li>"}</ul>
        </div>
      `;
    }).join("");

    return `
      <article class="day-card" style="animation-delay:${index * 90}ms">
        <h4 class="day-card__title">${escapeHtml(day.title)}</h4>
        ${blocksHtml}
      </article>
    `;
  }).join("");

  return `<div class="day-cards">${cards}</div>`;
}

function getPrompt(profile) {
  return `
You are an expert certified fitness coach.
Create a practical, safe, personalized weekly workout plan.

User profile:
- Goal: ${profile.goal}
- Workout location: ${profile.location}
- Experience: ${profile.experience}
- Age: ${profile.age}
- Gender: ${profile.gender}
- Activity level: ${profile.activityLevel}
- Program style preference: ${profile.programStyle}
- Days per week: ${profile.days}
- Minutes per session: ${profile.time}
- Injury/medical/training history: ${profile.history || "None provided"}

Rules:
- For beginners: avoid heavy high-skill barbell lifts unless clearly appropriate.
- Keep exercises aligned with equipment/location.
- Respect available training days and session time.
- Include warm-up, main work, and cooldown.
- Include progression advice for 4 weeks.
- Add personalized caution points based on history.

IMPORTANT: Use this exact structure and headings (do not skip sections):

[SECTION: Profile Snapshot]
- Goal: ...
- Location: ...
- Experience: ...
- Days/week: ...
- Session length: ...

[SECTION: Weekly Split]
- Describe the weekly schedule in order (Day 1, Day 2, etc.).

[SECTION: Day-by-Day Plan]

[DAY: Day 1 - descriptive title]
Warm-up:
- exercise
Main Workout:
- exercise (sets x reps or time)
Cooldown:
- exercise

[DAY: Day 2 - descriptive title]
(repeat for every training day in order)

[SECTION: 4-Week Progression]
- Week 1: ...
- Week 2: ...
- Week 3: ...
- Week 4: ...

[SECTION: Recommendations & Cautions]
- bullet points
  `.trim();
}

function renderPlan(planText, noteHtml) {
  const sections = getSections(planText);
  const rendered = sections.map((section) => {
    const isDaySection = /day[\s-]*by[\s-]*day/i.test(section.title);
    const body = isDaySection ? renderDayCards(section.lines) : renderLinesAsContent(section.lines);
    return `
      <section class="plan-section">
        <h3 class="plan-section__title">${escapeHtml(section.title)}</h3>
        <div class="plan-section__body">${body}</div>
      </section>
    `;
  }).join("");

  return `
    ${noteHtml}
    <header class="plan-header">
      <h2 class="plan-header__title">Your Personalized Workout Plan</h2>
      <p class="plan-header__subtitle">Follow sections in order from overview to daily workouts.</p>
    </header>
    <div class="plan-sections">${rendered}</div>
    <footer class="plan-footer">
      <h4 class="plan-footer__title">Important Notes</h4>
      <ul class="footnotes">
        <li>This is educational guidance, not medical advice.</li>
        <li>If you have any medical conditions, consult a professional first.</li>
      </ul>
    </footer>
  `;
}

async function getPlanFromBackend(prompt) {
  const response = await fetch("/.netlify/functions/generate-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "Failed to generate AI plan");
  return data.text;
}

function fallbackPlan(profile) {
  const days = Math.min(Number(profile.days) || 3, 6);
  const templates = [
    {
      title: "Lower Body + Core",
      warmup: ["5 min light cardio", "Hip circles x 10 each"],
      main: ["Goblet squat 3x10", "Romanian deadlift 3x10", "Walking lunges 3x10/leg", "Plank 3x30-45 sec"],
      cooldown: ["Quad stretch 30 sec/side", "Hamstring stretch 30 sec/side"]
    },
    {
      title: "Upper Push + Mobility",
      warmup: ["Band pull-aparts x 15", "Arm circles x 10 each"],
      main: ["Incline push-up 3x10", "Dumbbell shoulder press 3x10", "Triceps dips 3x10", "Side plank 3x20 sec/side"],
      cooldown: ["Chest doorway stretch", "Shoulder cross-body stretch"]
    },
    {
      title: "Upper Pull + Posterior Chain",
      warmup: ["Cat-cow x 8", "Scapular retractions x 12"],
      main: ["Lat pulldown or row 3x10", "Face pulls 3x15", "Hip hinge drill 2x10", "Glute bridge 3x12"],
      cooldown: ["Lat stretch", "Child's pose 45 sec"]
    }
  ];

  const dayBlocks = [];
  for (let i = 0; i < days; i += 1) {
    const t = templates[i % templates.length];
    dayBlocks.push(
      `[DAY: Day ${i + 1} - ${t.title}]\nWarm-up:\n- ${t.warmup.join("\n- ")}\nMain Workout:\n- ${t.main.join("\n- ")}\nCooldown:\n- ${t.cooldown.join("\n- ")}`
    );
  }

  return `
[SECTION: Profile Snapshot]
- Goal: ${profile.goal}
- Location: ${profile.location}
- Experience: ${profile.experience}
- Days/week: ${profile.days}
- Session length: ${profile.time} minutes

[SECTION: Weekly Split]
- Program style: ${profile.programStyle === "no-preference" ? "Balanced split" : profile.programStyle}
- Training days: ${profile.days} per week with at least 1 rest day between harder sessions.

[SECTION: Day-by-Day Plan]

${dayBlocks.join("\n\n")}

[SECTION: 4-Week Progression]
- Week 1: Learn form; stop with 2 reps in reserve.
- Week 2: Add 1 set on key lifts or +2 reps per set.
- Week 3: Increase load 2-5% if technique stays clean.
- Week 4: Deload — reduce sets/reps by 25-35%.

[SECTION: Recommendations & Cautions]
- History: ${profile.history || "No specific issues shared."}
- Stop any exercise causing sharp pain; swap for a safer variation.
  `.trim();
}

function validateStep(step) {
  const root = document.querySelector(`.form-step[data-step="${step}"]`);
  const fields = [...root.querySelectorAll("input, select, textarea")];
  for (const field of fields) {
    if (field.type === "radio") {
      const group = form.querySelectorAll(`input[name="${field.name}"]`);
      if (!Array.from(group).some((r) => r.checked)) return false;
      continue;
    }
    if (field.required && !field.value.trim()) return false;
  }
  return true;
}

function showStep(step) {
  currentStep = step;
  formSteps.forEach((section) => section.classList.toggle("active", Number(section.dataset.step) === step));
  stepChips.forEach((chip) => chip.classList.toggle("active", Number(chip.dataset.step) === step));
  prevStepBtn.classList.toggle("hidden", step === 1);
  nextStepBtn.classList.toggle("hidden", step === 3);
  generateBtn.classList.toggle("hidden", step !== 3);
}

function collectProfile() {
  return {
    goal: document.getElementById("goal").value,
    location: form.location.value,
    experience: form.experience.value,
    age: document.getElementById("age").value,
    gender: document.getElementById("gender").value,
    activityLevel: document.getElementById("activity-level").value,
    days: document.getElementById("days").value,
    time: document.getElementById("time").value,
    programStyle: document.getElementById("program-style").value,
    history: document.getElementById("history").value.trim()
  };
}

function getNutritionPlan(profile) {
  const age = Number(profile.age);
  const weightKg = profile.gender === "female" ? 62 : 75;
  const heightCm = profile.gender === "female" ? 162 : 175;
  const base = profile.gender === "female"
    ? 10 * weightKg + 6.25 * heightCm - 5 * age - 161
    : 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  const activityMap = { sedentary: 1.2, light: 1.375, moderate: 1.55, high: 1.725 };
  const tdee = Math.round(base * (activityMap[profile.activityLevel] || 1.4));

  let calories = tdee;
  if (profile.goal === "fat-loss") calories = tdee - 350;
  if (profile.goal === "muscle-gain") calories = tdee + 250;
  if (profile.goal === "strength") calories = tdee + 120;

  const protein = Math.round((profile.goal === "muscle-gain" ? 2.0 : 1.8) * weightKg);
  const fats = Math.round(0.8 * weightKg);
  const carbs = Math.max(120, Math.round((calories - protein * 4 - fats * 9) / 4));

  const goalLabel = {
    "fat-loss": "Fat loss",
    "muscle-gain": "Muscle gain",
    strength: "Strength",
    "general-fitness": "General fitness"
  }[profile.goal] || profile.goal;

  const nutritionText = [
    "Daily Targets",
    `Calories: ${calories} kcal/day`,
    `Protein: ${protein} g/day`,
    `Carbs: ${carbs} g/day`,
    `Fats: ${fats} g/day`,
    "",
    "Meal Structure",
    "3 main meals + 1 high-protein snack",
    "25-40g protein per meal",
    "Place more carbs around your workout window",
    "Hydration: 2.5 to 3.5 liters/day"
  ].join("\n");

  nutritionOutput.innerHTML = `
    <header class="nutrition-header">
      <h2 class="nutrition-header__title">Nutrition Guide</h2>
      <p class="nutrition-header__subtitle">Estimated targets for your goal: ${escapeHtml(goalLabel)}</p>
    </header>

    <section class="nutrition-section">
      <h3 class="nutrition-section__title">Daily Targets</h3>
      <p class="nutrition-section__lead">Aim for these daily averages to support your training.</p>
      <dl class="macro-grid">
        <div class="macro-item"><dt>Calories</dt><dd>${calories} kcal</dd></div>
        <div class="macro-item"><dt>Protein</dt><dd>${protein} g</dd></div>
        <div class="macro-item"><dt>Carbs</dt><dd>${carbs} g</dd></div>
        <div class="macro-item"><dt>Fats</dt><dd>${fats} g</dd></div>
      </dl>
    </section>

    <section class="nutrition-section">
      <h3 class="nutrition-section__title">Meal Structure</h3>
      <p class="nutrition-section__lead">Simple framework for organizing your day.</p>
      <ul class="nutrition-list">
        <li>3 main meals + 1 high-protein snack</li>
        <li>25–40g protein per meal</li>
        <li>Place more carbs around your workout window</li>
        <li>Hydration target: 2.5 to 3.5 liters per day</li>
      </ul>
    </section>

    <section class="nutrition-section">
      <h3 class="nutrition-section__title">Tips</h3>
      <ul class="nutrition-list">
        <li>Adjust calories by 100–150 every 2 weeks based on progress.</li>
        <li>Prioritize whole foods and consistent protein intake.</li>
      </ul>
    </section>
  `;
  return nutritionText;
}

function setupFadeIn() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("visible");
    });
  }, { threshold: 0.2 });
  document.querySelectorAll(".fade-item").forEach((el) => observer.observe(el));
}

nextStepBtn.addEventListener("click", () => {
  if (!validateStep(currentStep)) return;
  showStep(Math.min(3, currentStep + 1));
});

prevStepBtn.addEventListener("click", () => {
  showStep(Math.max(1, currentStep - 1));
});

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    tabButtons.forEach((b) => b.classList.toggle("active", b === btn));
    tabPanels.forEach((panel) => panel.classList.toggle("active", panel.id === `${tab}-output` || (tab === "workout" && panel.id === "plan-output")));
  });
});

downloadPdfBtn.addEventListener("click", () => {
  if (!latestPlanText) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const pdfText = `Workout Plan\n\n${latestPlanText}\n\nNutrition Guide\n\n${latestNutritionText || ""}`;
  const lines = doc.splitTextToSize(pdfText, 180);
  doc.text(lines, 15, 20);
  doc.save("personalized-fitness-plan.pdf");
});

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function fillFormWithRandomTestData() {
  const goals = ["fat-loss", "muscle-gain", "strength", "general-fitness"];
  document.getElementById("goal").value = pickRandom(goals);

  document.querySelector(`input[name="location"][value="${pickRandom(["gym", "home"])}"]`).checked = true;
  document.querySelector(`input[name="experience"][value="${pickRandom(["beginner", "intermediate", "advanced"])}"]`).checked = true;

  document.getElementById("age").value = String(randInt(18, 55));
  document.getElementById("gender").value = pickRandom(["male", "female", "non-binary", "prefer-not"]);
  document.getElementById("activity-level").value = pickRandom(["sedentary", "light", "moderate", "high"]);

  document.getElementById("history").value = pickRandom([
    "No injuries. Trained inconsistently before.",
    "Mild left shoulder discomfort on overhead presses; prefer machines.",
    "Previous ACL surgery years ago — no current pain.",
    "Lower back stiffness in mornings; prefers goblet squats.",
    ""
  ]);

  document.getElementById("days").value = String(randInt(3, 6));
  const times = [30, 45, 60, 75, 90];
  document.getElementById("time").value = String(pickRandom(times));
  document.getElementById("program-style").value = pickRandom([
    "push-pull-legs",
    "upper-lower",
    "bro-split",
    "full-body",
    "no-preference"
  ]);

  emailInput.value = `test.user.${Date.now()}@example.com`;

  document.querySelectorAll(".fade-item").forEach((el) => el.classList.add("visible"));
}

async function executePlanGeneration() {
  generateBtn.disabled = true;
  generateBtn.textContent = "Generating AI Plan...";
  resultSection.classList.remove("hidden");
  planOutput.innerHTML = "<p>Building your personalized plan...</p>";

  const profile = collectProfile();
  try {
    let planText = "";
    let backendError = "";
    try {
      planText = await getPlanFromBackend(getPrompt(profile));
    } catch (error) {
      backendError = error.message;
      planText = fallbackPlan(profile);
    }
    const note = backendError ? `<p><strong>Note:</strong> AI service unavailable. Showing fallback template. Reason: ${backendError}</p>` : "";
    latestPlanText = planText;
    latestNutritionText = getNutritionPlan(profile);
    planOutput.innerHTML = renderPlan(planText, note);
    tabButtons[0].click();
  } catch (error) {
    planOutput.innerHTML = `<p>Could not generate AI plan right now. ${error.message}. Please try again.</p>`;
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = "Generate My Free Plan";
    resultSection.scrollIntoView({ behavior: "smooth" });
  }
}

if (devFillBtn) {
  devFillBtn.addEventListener("click", async () => {
    fillFormWithRandomTestData();
    showStep(3);
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      planOutput.innerHTML = "<p>Something failed validation after auto-fill.</p>";
      resultSection.classList.remove("hidden");
      return;
    }
    await executePlanGeneration();
  });
}

sendEmailBtn.addEventListener("click", async () => {
  const userEmail = emailInput.value.trim();
  if (!userEmail || !latestPlanText) {
    emailStatus.textContent = "Enter your email and generate a plan first.";
    return;
  }
  if (EMAILJS_PUBLIC_KEY.includes("REPLACE_")) {
    emailStatus.textContent = "EmailJS is not configured yet in script.js.";
    return;
  }
  try {
    window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
    await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email: userEmail,
      subject: "Your Personalized Fitness Plan",
      workout_plan: latestPlanText,
      nutrition_plan: latestNutritionText
    });
    emailStatus.textContent = "Plan sent successfully.";
  } catch (error) {
    emailStatus.textContent = `Could not send email: ${error.message}`;
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateStep(3)) return;
  await executePlanGeneration();
});

setupFadeIn();
showStep(1);
