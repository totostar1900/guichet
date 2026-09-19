import { NextResponse } from "next/server";
import { getLang, getT } from "@/i18n/server";
import { buildGuideIndex } from "@/lib/guide-index";

/** The Guide's search index in the viewer's language, for the « ⋮ » menu; cached a while, it changes with deployments. */
export async function GET() {
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const index = await buildGuideIndex(t, lang);
  return NextResponse.json(index, { headers: { "Cache-Control": "private, max-age=600" } });
}
