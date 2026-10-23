import { NextResponse } from "next/server";
import { getLang, getT } from "@/i18n/server";
import { getSession } from "@/lib/auth";
import { isDesk } from "@/lib/auth/types";
import { buildGuideIndex } from "@/lib/guide-index";

/**
 * The Guide's search index in the viewer's language, for the « ⋮ » menu and the
 * magnifier on the phone's bar; cached a while, it changes with deployments.
 *
 * LE CACHE EST « private », et il le faut : la réponse dépend maintenant de la
 * session, puisqu'un client connecté reçoit en plus les pages, les services et
 * les instruments de l'application. Un cache partagé servirait la navigation
 * d'un client à un visiteur, ou l'inverse.
 *
 * UN OPÉRATEUR DU DESK N'EST PAS UN CLIENT, et « il y a une session » ne
 * suffisait pas à le dire : le « ⋮ » du desk recevait les 204 entrées du
 * client — dix services, huit instruments, « Qui vous êtes », « Sécurité » —
 * sur un HÔTE où ces adresses n'existent pas. Mesuré le 24 octobre 2026, le
 * lendemain du jour où l'index a appris à lire les tables. Le desk garde donc
 * le guide public : sa console a sa propre recherche.
 */
export async function GET() {
  const [t, lang, s] = await Promise.all([getT(), getLang(), getSession()]);
  const index = await buildGuideIndex(t, lang, { app: Boolean(s) && !isDesk(s) });
  return NextResponse.json(index, { headers: { "Cache-Control": "private, max-age=600" } });
}
