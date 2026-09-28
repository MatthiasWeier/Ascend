import type { QuestReminderCadence, QuestStatus } from "@prisma/client";
import { daysBetweenDateKeys } from "@/lib/german-time";

export const QUEST_REMINDER_HOUR = "09:00";
export const MAX_ACTIVE_QUESTS = 30;
export const MAX_STEPS_PER_QUEST = 30;

export const REMINDER_CADENCES: QuestReminderCadence[] = [
  "AUTO",
  "DAILY",
  "EVERY_3_DAYS",
  "WEEKLY",
  "BIWEEKLY",
  "MONTHLY",
  "NEVER",
];

export const REMINDER_CADENCE_LABEL: Record<QuestReminderCadence, string> = {
  AUTO: "Automatisch (je nach Dauer)",
  DAILY: "Täglich",
  EVERY_3_DAYS: "Alle 3 Tage",
  WEEKLY: "Wöchentlich",
  BIWEEKLY: "Alle 2 Wochen",
  MONTHLY: "Monatlich",
  NEVER: "Nie",
};

const FIXED_INTERVAL_DAYS: Record<Exclude<QuestReminderCadence, "AUTO" | "NEVER">, number> = {
  DAILY: 1,
  EVERY_3_DAYS: 3,
  WEEKLY: 7,
  BIWEEKLY: 14,
  MONTHLY: 30,
};

// Days between reminders, or null when reminders are off. AUTO scales with
// the total time frame (creation -> deadline): a two-week sprint deserves
// more nudging than a year-long goal.
export function reminderIntervalDays(
  cadence: QuestReminderCadence,
  createdKey: string,
  targetKey: string
): number | null {
  if (cadence === "NEVER") return null;
  if (cadence !== "AUTO") return FIXED_INTERVAL_DAYS[cadence];
  const total = daysBetweenDateKeys(createdKey, targetKey);
  if (total <= 14) return 2;
  if (total <= 60) return 7;
  if (total <= 180) return 14;
  return 30;
}

export type QuestStepDTO = { id: string; title: string; position: number; doneAt: string | null };

export type QuestDTO = {
  id: string;
  title: string;
  description: string | null;
  targetDateKey: string;
  sharedWithGroups: boolean;
  reminderCadence: QuestReminderCadence;
  status: QuestStatus;
  completedAt: string | null;
  createdAt: string;
  steps: QuestStepDTO[];
};

export const questInclude = { steps: { orderBy: { position: "asc" as const } } };
