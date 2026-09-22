import { common } from "./common";
import { shell } from "./shell";
import { workouts } from "./workouts";
import { groups } from "./groups";
import { analytics } from "./analytics";
import { settings } from "./settings";
import { legal } from "./legal";
import { tutorial } from "./tutorial";
import { climbingMeetups } from "./climbing-meetups";

// German source text -> English. Split by area only to keep files
// reviewable; everything is merged into one flat lookup.
export const en: Record<string, string> = {
  ...common,
  ...shell,
  ...workouts,
  ...groups,
  ...analytics,
  ...settings,
  ...legal,
  ...tutorial,
  ...climbingMeetups,
};
