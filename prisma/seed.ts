import "dotenv/config";
import { PrismaClient, ExerciseType, MuscleFocus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const exercises: { name: string; type: ExerciseType; focus: MuscleFocus }[] = [
  { name: "Bench Press", type: "REPS", focus: "PUSH" },
  { name: "Overhead Press", type: "REPS", focus: "PUSH" },
  { name: "Dips", type: "REPS", focus: "PUSH" },
  { name: "Push-ups", type: "REPS", focus: "PUSH" },
  { name: "Pull-ups", type: "REPS", focus: "PULL" },
  { name: "Barbell Row", type: "REPS", focus: "PULL" },
  { name: "Lat Pulldown", type: "REPS", focus: "PULL" },
  { name: "Deadlift", type: "REPS", focus: "LEGS" },
  { name: "Squat", type: "REPS", focus: "LEGS" },
  { name: "Lunges", type: "REPS", focus: "LEGS" },
  { name: "Plank", type: "HOLD", focus: "CORE" },
  { name: "Front Lever", type: "HOLD", focus: "CORE" },
  { name: "Hollow Body Hold", type: "HOLD", focus: "CORE" },
  { name: "Dead Hang", type: "HOLD", focus: "GRIP" },
  { name: "Farmer's Carry", type: "REPS", focus: "GRIP" },
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
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
