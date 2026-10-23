import { requireSession } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { Ligne } from "../Ligne";
import { chargerLesRayons } from "../rayons";
import { Rayon, titreDuRayon } from "../Rayon";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const generateMetadata = () => titreDuRayon("signes");

/**
 * CE QUE VOUS AVEZ SIGNÉ.
 *
 * Le pont à la fin du rayon n'est pas un document de plus : un texte de la
 * maison devient VOTRE document le jour où vous l'acceptez. Il prend alors une
 * date et une version, et il se lit dans la version acceptée.
 */
export default async function SignesPage() {
  const t = await getT();
  const s = await requireSession("/moi/documents/signes");
  const { signes, consent } = await chargerLesRayons(s.userId, t);
  return (
    <Rayon cle="signes">
      {signes.map((d) => (
        <Ligne key={d.id} titre={d.titre} sous={d.sous} etat={d.etat} ton={d.ton} geste={d.geste} />
      ))}
      {consent.version && (
        <Ligne
          titre={t("Mentions et responsabilités")}
          sous={t("version {v} · le texte de la maison, dans la version que vous avez acceptée", { v: consent.version })}
          etat={consent.at ? t("acceptées le {d}", { d: fmtDate(consent.at, false) }) : t("acceptées")}
          ton="fait"
          geste={{ label: t("Lire"), href: "/info/mentions" }}
        />
      )}
      {!signes.length && !consent.version && <p className="muted">{t("Votre convention et vos ordres signés paraîtront ici.")}</p>}
    </Rayon>
  );
}
