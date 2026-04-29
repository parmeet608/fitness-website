const form = document.getElementById("plan-form");
const resultSection = document.getElementById("result");
const planOutput = document.getElementById("plan-output");

const plans = {
  beginner: {
    gym: {
      "fat-loss": [
        "30-40 minutes brisk incline walk or bike",
        "Machine chest press - 3 x 10-12",
        "Seated row machine - 3 x 10-12",
        "Leg press - 3 x 12",
        "Dumbbell shoulder press - 3 x 10",
        "Plank - 3 x 20-30 sec"
      ],
      "muscle-gain": [
        "Light warm-up: treadmill 8-10 minutes",
        "Leg press - 4 x 8-12",
        "Dumbbell bench press - 4 x 8-12",
        "Lat pulldown machine - 4 x 10",
        "Dumbbell Romanian deadlift (light) - 3 x 10",
        "Cable triceps pushdown - 3 x 12"
      ],
      strength: [
        "Bike warm-up 10 minutes",
        "Hack squat or leg press machine - 4 x 6-8",
        "Machine chest press - 4 x 6-8",
        "Seated cable row - 4 x 8",
        "Dumbbell shoulder press - 3 x 8",
        "Farmer carry (dumbbells) - 3 x 30 sec"
      ],
      "general-fitness": [
        "5-10 minutes easy cardio warm-up",
        "Goblet squat - 3 x 10",
        "Machine chest press - 3 x 10",
        "Lat pulldown - 3 x 10",
        "Dumbbell lunges - 2 x 10 each leg",
        "Dead bug core exercise - 3 x 10"
      ]
    },
    home: {
      "fat-loss": [
        "Brisk walk or march in place - 15 minutes",
        "Bodyweight squat - 3 x 12",
        "Knee or incline push-ups - 3 x 8-12",
        "Dumbbell rows (or backpack row) - 3 x 12",
        "Step-ups on sturdy surface - 3 x 10 each leg",
        "Mountain climbers - 3 x 20 sec"
      ],
      "muscle-gain": [
        "Dynamic warm-up - 8 minutes",
        "Goblet squats (dumbbell/backpack) - 4 x 10",
        "Push-ups or dumbbell floor press - 4 x 8-12",
        "Single-arm dumbbell row - 4 x 10 each side",
        "Dumbbell shoulder press - 3 x 10",
        "Glute bridge - 3 x 15"
      ],
      strength: [
        "Mobility + warm-up - 8-10 minutes",
        "Split squat - 4 x 8 each leg",
        "Push-up progression - 4 x 6-10",
        "Single-arm row - 4 x 8 each side",
        "Dumbbell Romanian deadlift - 3 x 8-10",
        "Plank - 3 x 30 sec"
      ],
      "general-fitness": [
        "5 minute easy warm-up",
        "Bodyweight squat - 3 x 12",
        "Incline push-up - 3 x 10",
        "Bird dog - 3 x 10 each side",
        "Dumbbell row - 3 x 12 each side",
        "Walking lunges - 2 x 12 each leg"
      ]
    }
  },
  intermediate: {
    gym: {
      "fat-loss": [
        "Interval cardio 20 minutes",
        "Leg press - 4 x 10",
        "Bench press machine or dumbbell press - 4 x 10",
        "Cable row - 4 x 10",
        "Walking lunges - 3 x 12 each leg",
        "Core circuit 10 minutes"
      ],
      "muscle-gain": [
        "Warm-up 10 minutes",
        "Barbell squat or leg press - 4 x 6-10",
        "Bench press - 4 x 6-10",
        "Bent-over row - 4 x 8-10",
        "Romanian deadlift - 3 x 8",
        "Biceps + triceps superset - 3 x 12"
      ],
      strength: [
        "Warm-up and activation 10 minutes",
        "Barbell squat - 5 x 5",
        "Bench press - 5 x 5",
        "Deadlift - 4 x 4",
        "Overhead press - 4 x 6",
        "Plank + side plank - 3 rounds"
      ],
      "general-fitness": [
        "Cardio warm-up 10 minutes",
        "Squat pattern - 4 x 8",
        "Push pattern - 4 x 8",
        "Pull pattern - 4 x 8",
        "Lunge pattern - 3 x 10 each leg",
        "Core + cooldown 10 minutes"
      ]
    },
    home: {
      "fat-loss": [
        "HIIT circuit 20 minutes",
        "Squat to press - 4 x 12",
        "Push-ups - 4 x 12",
        "Rows (dumbbell/band) - 4 x 12",
        "Reverse lunges - 3 x 12 each leg",
        "Core finisher 8 minutes"
      ],
      "muscle-gain": [
        "Warm-up 8 minutes",
        "Goblet squat - 4 x 8-12",
        "Dumbbell floor press - 4 x 8-12",
        "Single-arm row - 4 x 8-12",
        "Dumbbell RDL - 4 x 10",
        "Overhead press - 3 x 10"
      ],
      strength: [
        "Warm-up 10 minutes",
        "Bulgarian split squat - 4 x 6-8 each leg",
        "Weighted push-up or floor press - 4 x 6-8",
        "Heavy one-arm row - 4 x 6-8",
        "Single-leg RDL - 3 x 8 each side",
        "Plank variations - 3 rounds"
      ],
      "general-fitness": [
        "Mobility warm-up 6 minutes",
        "Bodyweight + dumbbell full-body circuit - 4 rounds",
        "Squats, push-ups, rows, lunges, plank",
        "Work 40 sec / Rest 20 sec per movement",
        "Cooldown stretch 8 minutes"
      ]
    }
  },
  advanced: {
    gym: {
      "fat-loss": [
        "Heavy lifting + intervals 60 minutes total",
        "Compound lift tri-set x 4 rounds",
        "Accessory hypertrophy blocks x 3",
        "Conditioning finisher 12-15 minutes"
      ],
      "muscle-gain": [
        "Push/Pull/Leg split with progressive overload",
        "Main lifts 4-6 sets + accessories 3-5 sets",
        "Track volume and load weekly"
      ],
      strength: [
        "Periodized squat/bench/deadlift programming",
        "Low rep top sets + back-off volume",
        "Technique and recovery sessions included"
      ],
      "general-fitness": [
        "Hybrid plan: strength, conditioning, mobility",
        "4-6 sessions/week with varied intensities"
      ]
    },
    home: {
      "fat-loss": [
        "High-density circuits and sprint intervals",
        "Progressive bodyweight and dumbbell complexes"
      ],
      "muscle-gain": [
        "High-volume dumbbell training split",
        "Advanced tempo work and drop sets"
      ],
      strength: [
        "Unilateral strength blocks and explosive drills",
        "Loaded carries, advanced core, progression tracking"
      ],
      "general-fitness": [
        "Athletic hybrid training schedule",
        "Conditioning, strength, and mobility cycles"
      ]
    }
  }
};

function getFriendlyGoalLabel(goal) {
  const labels = {
    "fat-loss": "Fat Loss",
    "muscle-gain": "Muscle Gain",
    strength: "Build Strength",
    "general-fitness": "General Fitness"
  };
  return labels[goal] || "Your Goal";
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const goal = document.getElementById("goal").value;
  const location = form.location.value;
  const experience = form.experience.value;

  if (!goal || !location || !experience) {
    return;
  }

  const selectedPlan = plans[experience][location][goal];
  const beginnerNote =
    experience === "beginner"
      ? "<p><strong>Beginner note:</strong> This plan avoids advanced barbell lifts like heavy back squats and conventional deadlifts. Focus on machines, dumbbells, and safe technique first.</p>"
      : "";

  let html = `
    <p><strong>Goal:</strong> ${getFriendlyGoalLabel(goal)}</p>
    <p><strong>Workout location:</strong> ${location === "gym" ? "Gym" : "Home"}</p>
    <p><strong>Experience:</strong> ${experience.charAt(0).toUpperCase() + experience.slice(1)}</p>
    ${beginnerNote}
    <h3>Weekly Structure</h3>
    <p>Train 3-4 days per week. Rest at least 1 day between hard sessions. Start light and increase weight slowly when reps feel easier.</p>
    <h3>Session Plan</h3>
    <ul>
      ${selectedPlan.map((exercise) => `<li>${exercise}</li>`).join("")}
    </ul>
    <h3>Important Tips</h3>
    <ul>
      <li>Warm up before training and cool down after.</li>
      <li>Stop any movement that causes sharp pain.</li>
      <li>Prioritize consistent sleep, hydration, and protein intake.</li>
    </ul>
  `;

  planOutput.innerHTML = html;
  resultSection.classList.remove("hidden");
  resultSection.scrollIntoView({ behavior: "smooth" });
});
