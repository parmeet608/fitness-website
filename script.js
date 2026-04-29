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

function formatTextAsHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
}

function cleanBullet(line) {
  return line.replace(/^[-*]\s*/, "").trim();
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

Return in plain text with sections:
1) Profile Snapshot
2) Weekly Split
3) Day-by-Day Plan
4) 4-Week Progression
5) Personalized Recommendations and Cautions
  `.trim();
}

function getSections(planText) {
  const sections = planText.split(/\n(?=\d\)\s)/).map((s) => s.trim()).filter(Boolean).map((section) => {
    const lines = section.split("\n").map((l) => l.trim()).filter(Boolean);
    const titleLine = lines.shift() || "";
    return { title: titleLine.replace(/^\d\)\s*/, ""), lines };
  });
  return sections.length ? sections : [{ title: "Workout Plan", lines: planText.split("\n") }];
}

function renderDayCards(lines) {
  const days = [];
  let current = null;
  const dayHeaderPattern = /^(day\s*\d+|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;

  lines.forEach((rawLine) => {
    const line = cleanBullet(rawLine);
    if (!line) return;
    if (dayHeaderPattern.test(line)) {
      current = { title: line, items: [] };
      days.push(current);
      return;
    }
    if (!current) {
      current = { title: `Day ${days.length + 1}`, items: [] };
      days.push(current);
    }
    current.items.push(line);
  });

  const cards = days.map((day, index) => {
    const listItems = day.items.map((item) => `<li>${formatTextAsHtml(item)}</li>`).join("");
    return `
      <article class="day-card" style="animation-delay:${index * 90}ms">
        <h4>${formatTextAsHtml(day.title)}</h4>
        <ul>${listItems || "<li>Details were not provided.</li>"}</ul>
      </article>
    `;
  }).join("");
  return cards ? `<div class="day-cards">${cards}</div>` : "";
}

function renderPlan(planText, noteHtml) {
  const sections = getSections(planText);
  const rendered = sections.map((section) => {
    if (/day-?by-?day plan/i.test(section.title)) {
      return `<div class="section-block"><h3>${formatTextAsHtml(section.title)}</h3>${renderDayCards(section.lines)}</div>`;
    }
    const bullets = section.lines.filter((line) => /^[-*]\s+/.test(line));
    const plainLines = section.lines.filter((line) => !/^[-*]\s+/.test(line));
    const bulletHtml = bullets.length ? `<ul>${bullets.map((line) => `<li>${formatTextAsHtml(cleanBullet(line))}</li>`).join("")}</ul>` : "";
    const plainHtml = plainLines.length ? `<p>${formatTextAsHtml(plainLines.join("\n"))}</p>` : "";
    return `<div class="section-block"><h3>${formatTextAsHtml(section.title)}</h3>${plainHtml}${bulletHtml}</div>`;
  }).join("");

  return `
    ${noteHtml}
    <h3>Your Personalized Workout Plan</h3>
    ${rendered}
    <ul class="footnotes">
      <li>This is educational guidance, not medical advice.</li>
      <li>If you have any medical conditions, consult a professional first.</li>
    </ul>
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
  return `
1) Profile Snapshot
- Goal: ${profile.goal}
- Location: ${profile.location}
- Experience: ${profile.experience}
- Days/week: ${profile.days}
- Time/session: ${profile.time} minutes

2) Weekly Split
- Program style: ${profile.programStyle === "no-preference" ? "AI-chosen balanced split" : profile.programStyle}
- Suggested schedule: ${profile.days} days/week with at least 1 rest day after 2-3 sessions.

3) Day-by-Day Plan
- Day 1: Lower body + core with controlled form and moderate volume.
- Day 2: Upper push + mobility cooldown.
- Day 3: Upper pull + posterior chain focus.
- Day 4+: Repeat pattern based on weekly days and recovery.

4) 4-Week Progression
- Week 1: Learn form and stop with 2 reps in reserve.
- Week 2: Add 1 set on key movements or +2 reps each set.
- Week 3: Increase load slightly (2-5%) if technique remains clean.
- Week 4: Deload by reducing volume by 25-35%.

5) Personalized Recommendations and Cautions
- History notes: ${profile.history || "No specific issues shared."}
- Stop any exercise causing sharp pain and replace with safer alternatives.
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

  const nutritionText = `
Estimated calories: ${calories} kcal/day
Protein: ${protein} g/day
Carbs: ${carbs} g/day
Fats: ${fats} g/day

Suggested meal structure:
- 3 main meals + 1 high-protein snack
- 25-40g protein per meal
- Place more carbs around your workout window
- Hydration target: 2.5 to 3.5 liters/day
  `.trim();

  nutritionOutput.innerHTML = `
    <h3>Nutrition Recommendation</h3>
    <p>${formatTextAsHtml(nutritionText)}</p>
    <ul>
      <li>Adjust calories by 100-150 every 2 weeks based on progress.</li>
      <li>Prioritize whole foods and consistent protein intake.</li>
    </ul>
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
