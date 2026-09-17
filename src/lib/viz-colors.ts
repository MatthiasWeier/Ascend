// Validated against the dataviz skill's six-check palette validator
// (scripts/validate_palette.js) for our actual light (#fcfcfa) and dark
// (#151410) chart surfaces. Do not hand-pick new chart colors without
// re-running that validator - see the skill for the procedure.

// Categorical, 2 series (documented default palette, slots 1 + 2 - the
// worst-case adjacent CVD pair in that palette is elsewhere, so this pair
// clears the floor comfortably).
export const VIZ_CATEGORICAL = {
  goal: { light: "#2a78d6", dark: "#3987e5" }, // slot 1 - blue
  actual: { light: "#eb6834", dark: "#d95926" }, // slot 2 - orange
};

// Sequential, single hue (blue), light -> dark. From the documented ramp,
// steps 100/250/400/550/700 - used for the activity calendar heatmap.
export const VIZ_SEQUENTIAL = ["#cde2fb", "#86b6ef", "#3987e5", "#1c5cab", "#0d366b"];

// Ordinal, single hue (brand orange), light -> dark. Custom-derived and
// validated with --ordinal for both surfaces; identical hex works in both
// modes. Used for the climbing grade pyramid (grade order carries meaning).
export const VIZ_ORDINAL = ["#f49567", "#e1763f", "#ca5706", "#b03a00", "#8f2600"];

// Fixed status/delta text colors (never themed, mode-specific per the skill).
export const VIZ_DELTA_GOOD = { light: "#006300", dark: "#0ca30c" };
export const VIZ_DELTA_BAD = "#d03b3b";
