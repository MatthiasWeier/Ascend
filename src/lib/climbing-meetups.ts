import type { ClimbingFocus, MeetupActivity } from "@prisma/client";

// "ClimbingFocus" is the Prisma/DB name (see schema.prisma) - the type
// itself now covers any meetup activity, not just climbing.
export const ALL_MEETUP_FOCUSES: ClimbingFocus[] = [
  "SLAB",
  "POWER",
  "TECHNIK",
  "AUSDAUER",
  "KRAFT",
  "MENTAL",
  "PUSH",
  "PULL",
  "LEGS",
  "CORE",
  "GRIP",
];

// German source text = i18n key.
export const MEETUP_FOCUS_LABEL: Record<ClimbingFocus, string> = {
  SLAB: "Slab",
  POWER: "Power",
  TECHNIK: "Technik",
  AUSDAUER: "Ausdauer",
  KRAFT: "Kraft",
  MENTAL: "Mental",
  PUSH: "Push",
  PULL: "Pull",
  LEGS: "Beine",
  CORE: "Core",
  GRIP: "Grip",
};

export const MEETUP_ACTIVITIES: MeetupActivity[] = ["CLIMBING", "GYM", "OTHER"];

export const MEETUP_ACTIVITY_LABEL: Record<MeetupActivity, string> = {
  CLIMBING: "Klettern",
  GYM: "Gym",
  OTHER: "Sonstiges",
};

// Which focus tags make sense to offer for each activity - climbing terms
// for a climbing day, muscle groups for a gym day, a light generic set
// otherwise. Purely a UI narrowing; the DB accepts any of the 11 values
// regardless of activity.
export const FOCUSES_BY_ACTIVITY: Record<MeetupActivity, ClimbingFocus[]> = {
  CLIMBING: ["SLAB", "POWER", "TECHNIK", "AUSDAUER", "KRAFT", "MENTAL"],
  GYM: ["PUSH", "PULL", "LEGS", "CORE", "GRIP"],
  OTHER: ["AUSDAUER", "KRAFT", "MENTAL"],
};

// What to call a meetup in the UI when it has no custom title - "Klettern"
// for a climbing day, the activity's own label otherwise.
export function meetupDisplayName(activity: MeetupActivity, title: string | null): string {
  return title?.trim() || MEETUP_ACTIVITY_LABEL[activity];
}

export const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
