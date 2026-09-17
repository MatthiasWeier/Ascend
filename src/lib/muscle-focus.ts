import type { MuscleFocus } from "@prisma/client";

export const FOCUS_LABEL: Record<MuscleFocus, string> = {
  PUSH: "Push",
  PULL: "Pull",
  LEGS: "Beine",
  CORE: "Core",
  GRIP: "Grip",
};

export const ALL_FOCUSES: MuscleFocus[] = ["PUSH", "PULL", "LEGS", "CORE", "GRIP"];
