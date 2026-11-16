import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { lireLesMandats } from "../donnees";
import { MesMandats } from "../MesMandats";
import styles from "../page.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";
import { EnBref } from "@/components/EnBref";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Mon mandat") };
}

/**
 * LA PAGE D'UN MANDAT (15 novembre 2026, option A) : ce qu'il fait prélever, sur quel compte, et le seul geste qu'il attend — recevoir le code, signer, envoyer la copie signée à la main,
 * ou, quand il est en place, lire son exemplaire et le révoquer. Le retour est le sommaire (nav-parent retire le dernier segment).
 */
export default async function MandatPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const t = await getT();
  const s = await requireSession(`/moi/prelevements/${id}`);
  const { vus, canal, injoignable, fiche } = await lireLesMandats(s.userId);
  const m = vus.find((x) => x.id === id);
  if (!m) notFound();
  /* Un mandat retiré n'a plus de page : on revient au sommaire (la révocation se fait depuis cette page, qui se rend sans lui avant que la carte ne puisse le dire). */
  if (m.etat === "revoque") redirect("/moi/argent#en-place");
  return (
    <Glissement>
      <div className={styles.wrap}>
        <EnTete
          surTitre={t("Mon mandat")}
          titre={m.objet === "provision" ? t("Ma provision") : m.fonds ? t("Mon épargne vers {f}", { f: m.fonds }) : t("Mon épargne programmée")}
          phrase={t("Ce qui sera prélevé, sur quel compte, et ce qu'il attend de vous.")}
          aCote={<EnBref brief="prelevement" />}
        />
        <MesMandats mandats={[m]} canal={canal} dossier={Boolean(fiche)} injoignable={injoignable} ouvertDoffice={"retirer" in sp} />
      </div>
    </Glissement>
  );
}
