import "dotenv/config";
import { PrismaClient, ExerciseType, MuscleFocus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type ExerciseSeed = {
  name: string;
  type: ExerciseType;
  focus: MuscleFocus;
  isBodyweight?: boolean;
  description?: string;
};

const exercises: ExerciseSeed[] = [
  // --- PUSH ---
  { name: "Bench Press", type: "REPS", focus: "PUSH" },
  { name: "Incline Bench Press", type: "REPS", focus: "PUSH" },
  { name: "Close-Grip Bench Press", type: "REPS", focus: "PUSH" },
  { name: "Overhead Press", type: "REPS", focus: "PUSH" },
  { name: "Shoulder Press (Machine)", type: "REPS", focus: "PUSH" },
  { name: "Chest Press (Machine)", type: "REPS", focus: "PUSH" },
  { name: "Push-ups", type: "REPS", focus: "PUSH", isBodyweight: true },
  { name: "Diamond Push-ups", type: "REPS", focus: "PUSH", isBodyweight: true },
  { name: "Archer Push-ups", type: "REPS", focus: "PUSH", isBodyweight: true },
  { name: "Pike Push-ups", type: "REPS", focus: "PUSH", isBodyweight: true },
  { name: "Handstand Push-ups", type: "REPS", focus: "PUSH", isBodyweight: true },
  { name: "Dips", type: "REPS", focus: "PUSH", isBodyweight: true },

  // --- PULL ---
  { name: "Pull-ups", type: "REPS", focus: "PULL", isBodyweight: true },
  { name: "Chin-ups", type: "REPS", focus: "PULL", isBodyweight: true },
  { name: "Wide Grip Pull-ups", type: "REPS", focus: "PULL", isBodyweight: true },
  { name: "Muscle-ups", type: "REPS", focus: "PULL", isBodyweight: true },
  { name: "Inverted Rows", type: "REPS", focus: "PULL", isBodyweight: true },
  { name: "Barbell Row", type: "REPS", focus: "PULL" },
  { name: "Lat Pulldown", type: "REPS", focus: "PULL" },
  { name: "Seated Cable Row", type: "REPS", focus: "PULL" },
  { name: "Face Pulls", type: "REPS", focus: "PULL" },
  { name: "Bicep Curls", type: "REPS", focus: "PULL" },
  { name: "Hammer Curls", type: "REPS", focus: "PULL" },

  // --- LEGS ---
  { name: "Squat", type: "REPS", focus: "LEGS" },
  { name: "Front Squat", type: "REPS", focus: "LEGS" },
  { name: "Bodyweight Squats", type: "REPS", focus: "LEGS", isBodyweight: true },
  { name: "Pistol Squat", type: "REPS", focus: "LEGS", isBodyweight: true },
  { name: "Deadlift", type: "REPS", focus: "LEGS" },
  { name: "Romanian Deadlift", type: "REPS", focus: "LEGS" },
  { name: "Leg Press", type: "REPS", focus: "LEGS" },
  { name: "Bulgarian Split Squat", type: "REPS", focus: "LEGS" },
  { name: "Lunges", type: "REPS", focus: "LEGS", isBodyweight: true },
  { name: "Step-ups", type: "REPS", focus: "LEGS" },
  { name: "Hip Thrust", type: "REPS", focus: "LEGS" },
  { name: "Calf Raises", type: "REPS", focus: "LEGS" },
  { name: "Nordic Curl", type: "REPS", focus: "LEGS", isBodyweight: true },
  { name: "Box Jumps", type: "REPS", focus: "LEGS", isBodyweight: true },

  // --- CORE ---
  { name: "Sit-ups", type: "REPS", focus: "CORE", isBodyweight: true },
  { name: "Hanging Leg Raise", type: "REPS", focus: "CORE", isBodyweight: true },
  { name: "Russian Twists", type: "REPS", focus: "CORE" },
  { name: "Ab Wheel Rollout", type: "REPS", focus: "CORE", isBodyweight: true },
  { name: "Mountain Climbers", type: "REPS", focus: "CORE", isBodyweight: true },
  { name: "Burpees", type: "REPS", focus: "CORE", isBodyweight: true },
  { name: "Plank", type: "HOLD", focus: "CORE", isBodyweight: true },
  { name: "Side Plank", type: "HOLD", focus: "CORE", isBodyweight: true },
  { name: "Front Lever", type: "HOLD", focus: "CORE", isBodyweight: true },
  { name: "Hollow Body Hold", type: "HOLD", focus: "CORE", isBodyweight: true },
  { name: "L-Sit", type: "HOLD", focus: "CORE", isBodyweight: true },

  // --- GRIP ---
  { name: "Dead Hang", type: "HOLD", focus: "GRIP", isBodyweight: true },
  { name: "Fingerboard Hang", type: "HOLD", focus: "GRIP", isBodyweight: true },
  { name: "Farmer's Carry", type: "REPS", focus: "GRIP" },
  { name: "Plate Pinch", type: "HOLD", focus: "GRIP" },
  { name: "Wrist Curls", type: "REPS", focus: "GRIP" },
];

// Daily-challenge themes the leader can activate for the group - each tied
// to a REPS exercise, since goals are counted in reps.
const challengeTemplates: { name: string; description: string; exerciseName: string }[] = [
  { name: "Pullup Maxing", description: "So viele Klimmzüge wie möglich bis zu deinem Ziel.", exerciseName: "Pull-ups" },
  { name: "Pushup Power", description: "Liegestütze satt - knallhart bis zum Ziel.", exerciseName: "Push-ups" },
  { name: "Dip Domination", description: "Dips ohne Gnade.", exerciseName: "Dips" },
  { name: "Squat Streak", description: "Bodyweight Squats am laufenden Band.", exerciseName: "Bodyweight Squats" },
  { name: "Sit-up Sprint", description: "Sit-ups gegen die Uhr.", exerciseName: "Sit-ups" },
  { name: "Burpee Blitz", description: "Burpees - der Allrounder-Killer.", exerciseName: "Burpees" },
  { name: "Lunge Legacy", description: "Ausfallschritte für starke Beine.", exerciseName: "Lunges" },
  { name: "Archer Push-up Ascent", description: "Einarmig(er) drücken für Fortgeschrittene.", exerciseName: "Archer Push-ups" },
];

async function main() {
  for (const exercise of exercises) {
    await prisma.exercise.upsert({
      where: { name: exercise.name },
      update: {},
      create: exercise,
    });
  }
  console.log(`Seeded ${exercises.length} exercises.`);

  for (const template of challengeTemplates) {
    const exercise = await prisma.exercise.findUniqueOrThrow({ where: { name: template.exerciseName } });
    await prisma.challengeTemplate.upsert({
      where: { name: template.name },
      update: {},
      create: { name: template.name, description: template.description, exerciseId: exercise.id },
    });
  }
  console.log(`Seeded ${challengeTemplates.length} challenge templates.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
