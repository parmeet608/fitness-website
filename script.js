const form = document.getElementById("plan-form");
const resultSection = document.getElementById("result");
const planOutput = document.getElementById("plan-output");

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
- Cardio after weights: ${profile.cardio}
- Injury/medical/training history: ${profile.history || "None provided"}

Rules:
- For beginners: avoid heavy high-skill barbell lifts unless clearly appropriate.
- Keep exercises aligned with equipment/location.
- Respect available training days and session time.
- Include warm-up, main work, and cooldown.
- Include progression advice for 4 weeks.
- Add personalized caution points based on history.
- Include cardio recommendations based on goal and preference.

Return in plain text with sections:
1) Profile Snapshot
2) Weekly Split
3) Day-by-Day Plan
4) Cardio Plan
5) 4-Week Progression
6) Personalized Recommendations and Cautions
  `.trim();
}

function formatTextAsHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

async function getPlanFromBackend(prompt) {
  const response = await fetch("/.netlify/functions/generate-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || "Failed to generate AI plan");
  }

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
- Start each session with 8-10 min warm-up and end with 5-8 min cooldown.
- Build workouts around compound + isolation movements matching your equipment (${profile.location}).
- Keep 5-7 exercises/session to fit your time.

4) Cardio Plan
- Cardio preference: ${profile.cardio}.
- If yes/sometimes: 10-20 min low-to-moderate cardio after lifting 2-4 times/week.

5) 4-Week Progression
- Week 1: Learn form and stop with 2 reps in reserve.
- Week 2: Add 1 set on key movements or +2 reps each set.
- Week 3: Increase load slightly (2-5%) if technique remains clean.
- Week 4: Deload by reducing volume by 25-35%.

6) Personalized Recommendations and Cautions
- Based on your profile, prioritize movement quality, sleep, protein, and hydration.
- History notes: ${profile.history || "No specific issues shared."}
- Stop any exercise causing sharp pain and replace with safer alternatives.
  `.trim();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = form.querySelector("button[type='submit']");
  const profile = {
    goal: document.getElementById("goal").value,
    location: form.location.value,
    experience: form.experience.value,
    age: document.getElementById("age").value,
    gender: document.getElementById("gender").value,
    activityLevel: document.getElementById("activity-level").value,
    days: document.getElementById("days").value,
    time: document.getElementById("time").value,
    programStyle: document.getElementById("program-style").value,
    cardio: form.cardio.value,
    history: document.getElementById("history").value.trim()
  };

  if (Object.values(profile).some((value) => !value && value !== profile.history)) {
    return;
  }

  button.disabled = true;
  button.textContent = "Generating AI Plan...";
  resultSection.classList.remove("hidden");
  planOutput.innerHTML = "<p>Building your personalized plan...</p>";

  try {
    let planText = "";
    let backendError = "";
    const prompt = getPrompt(profile);

    try {
      planText = await getPlanFromBackend(prompt);
    } catch (error) {
      backendError = error.message;
      planText = fallbackPlan(profile);
    }

    const usingFallback = backendError
      ? `<p><strong>Note:</strong> AI service unavailable, so a fallback template is shown. Reason: ${backendError}</p>`
      : "";

    planOutput.innerHTML = `
    ${usingFallback}
    <h3>Your Personalized Workout Plan</h3>
    <p>${formatTextAsHtml(planText)}</p>
    <ul>
      <li>This is educational guidance, not medical advice.</li>
      <li>If you have any medical conditions, consult a professional first.</li>
    </ul>
  `;
  } catch (error) {
    planOutput.innerHTML = `<p>Could not generate AI plan right now. ${error.message}. Please try again.</p>`;
  } finally {
    button.disabled = false;
    button.textContent = "Generate My Free Plan";
    resultSection.scrollIntoView({ behavior: "smooth" });
  }
});
