import { headers } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isDesk } from "@/lib/auth/types";
import { isDeskHost } from "@/lib/hosts";
import { repo } from "@/lib/data";
import { LEGAL_VERSION } from "@/data/legal";
import { authMode } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { Glissement } from "@/components/mobile/Glissement";
import { CreerCompte, type EtapeDeDepart } from "./CreerCompte";
import { CODE_DE_DEMONSTRATION } from "./demo";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Créer votre compte") };
}

/**
 * LA CRÉATION D'UN COMPTE, EN UN PARCOURS QUI SE REPREND OÙ IL S'EST ARRÊTÉ.
 *
 * La page lit l'état (session, numéro prouvé, mentions acceptées) et choisit
 * l'écran de départ : fermer l'onglet entre le code et le numéro ne refait pas
 * faire l'adresse. Les deux derniers pas (le code de l'appareil, la biométrie)
 * se jouent dans le navigateur, qui seul sait ce qu'il porte.
 *
 * L'ADMINISTRATION N'A PAS DE CRÉATION : le desk entre par son adresse
 * professionnelle, sur sa porte.
 */
export default async function CreerUnComptePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: n = "/" } = await searchParams;
  const next = n.startsWith("/") && !n.startsWith("//") ? n : "/";
  if (isDeskHost((await headers()).get("host"))) redirect("/connexion", RedirectType.replace);
  const session = await getSession();
  if (session && isDesk(session)) redirect(next, RedirectType.replace);

  let depart: EtapeDeDepart = "email";
  let adresse = "";
  let codeExiste = false;
  if (session) {
    adresse = session.email ?? "";
    const [canaux, consentement] = await Promise.all([repo().getChannelStatus(session.userId), repo().getConsent(session.userId)]);
    codeExiste = (await repo().listDevices(session.userId).catch(() => [])).some((d) => d.kind === "code");
    depart = !(canaux.phoneVerifiedAt || session.phoneVerified) ? "telephone" : consentement.version !== LEGAL_VERSION ? "avant" : "appareil";
  }
  return (
    <Glissement>
      <CreerCompte codeExiste={codeExiste} depart={depart} adresse={adresse} next={next} demo={authMode() !== "supabase" ? CODE_DE_DEMONSTRATION : undefined} legalVersion={LEGAL_VERSION} />
    </Glissement>
  );
}
