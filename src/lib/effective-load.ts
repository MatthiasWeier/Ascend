// Pure calculation, deliberately split out of lib/bodyweight.ts (which
// imports prisma) so client components can use it - lib/muscle-focus.ts is
// imported from client feed components just for FOCUS_LABEL/colors, and
// pulling in prisma transitively breaks the client bundle.
export function effectiveLoadKg(isBodyweight: boolean, bodyWeightKg: number | null, addedWeightKg: number | null) {
  const added = addedWeightKg ?? 0;
  if (!isBodyweight) return added;
  return (bodyWeightKg ?? 0) + added;
}
