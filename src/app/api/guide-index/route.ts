import { NextResponse } from "next/server";
import { getLang, getT } from "@/i18n/server";
import { getSession } from "@/lib/auth";
import { buildGuideIndex } from "@/lib/guide-index";

/**
 * The Guide's search index in the viewer's language, for the « ⋮ » menu and the
 * magnifier on the phone's bar; cached a while, it changes with deployments.
 *
 * LE CACHE EST « private », et il le faut : la réponse dépend maintenant de la
 * session, puisqu'un client connecté reçoit en plus les pages, les services et
 * les instruments de l'application. Un cache partagé servirait la navigation
 * d'un client à un visiteur, ou l'inverse.
 */
export async function GET() {
  const [t, lang, s] = await Promise.all([getT(), getLang(), getSession()]);
  const index = await buildGuideIndex(t, lang, { app: Boolean(s) });
  return NextResponse.json(index, { headers: { "Cache-Control": "private, max-age=600" } });
}
