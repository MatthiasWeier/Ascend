import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { getBrainSuggestion } from "@/lib/workout-brain";
import { makeT, normalizeLocale } from "@/lib/i18n";

// "What should I train today" for external automations (Home Assistant,
// etc.) - the same Workout Brain logic the dashboard card uses, just
// without a browser session. Locale via ?lang=de|en (default de), since
// there's no locale cookie to read here.
export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const t = makeT(normalizeLocale(searchParams.get("lang")));

  const suggestion = await getBrainSuggestion(auth.userId, t);
  return NextResponse.json(suggestion);
}
