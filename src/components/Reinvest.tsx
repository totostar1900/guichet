import Link from "next/link";
import type { Position } from "@/lib/positions";
import type { CashEntry } from "@/lib/domain/cash";
import { bilan, suivre, type FluxSuivi, type LigneTenue } from "@/lib/domain/encaissement";
import type { Temoignage } from "@/lib/domain/temoignage";
import { fmt, fmtDate } from "@/lib/format";
import { getT } from "@/i18n/server";
import { DireLeFlux } from "./DireLeFlux";
import styles from "./Reinvest.module.css";

/**
 * Ce qui est revenu, et l'occasion de le replacer.
 *
 * Un coupon échu s'oublie. Il tombe sur un compte en banque, se mêle au reste
 * et cesse de rapporter, alors que la ligne qui l'a versé, elle, continue. Sur
 * un portefeuille obligataire tenu jusqu'à l'échéance, c'est la seule décision
 * que le client ait à prendre entre l'achat et le remboursement, et rien ne la
 * lui rappelait.
 *
 * ─── Ce qui a changé, et pourquoi c'est le service ─────────────────────────
 *
 * Cette bande disait « échu », jamais « reçu ». C'était honnête : l'application
 * connaissait la date d'un flux et pas son arrivée, et ce mot prudent tenait
 * lieu de comptabilité. Mais un client lisait « 180 000 FCFA échus depuis le
 * 14 mars » sans savoir si l'argent était là, ce qui est précisément la seule
 * chose qu'il voulait savoir.
 *
 * Le journal des espèces répond maintenant, et la bande porte deux phrases là
 * où elle en portait une :
 *
 *   REÇU    : un mouvement du journal porte cette échéance. L'argent est là, et
 *             c'est la somme qu'un réinvestissement peut engager.
 *   ATTENDU : l'échéance est passée et rien n'est arrivé. Le dire est un
 *             service : le client apprend que l'émetteur lui doit quelque chose.
 *
 * Les additionner perdrait exactement ce qu'on vient de gagner. Elles restent
 * donc deux, et « reçu » est la seule qui porte un bouton : proposer de
 * replacer un argent qui n'est pas arrivé serait mentir.
 *
 * Et elle ne recommande aucune ligne. Elle rappelle une somme, puis ouvre les
 * listes. Choisir pour le client demanderait un agrément que la maison n'a pas.
 */
export async function Reinvest({
  positions,
  entries = [],
  temoignages = [],
  days = 120,
  now = new Date(),
}: {
  positions: Position[];
  /** Le journal du client : sans lui, la bande ne sait que dire « échu ». */
  entries?: CashEntry[];
  /** Ce que le client a déjà dit de ses échéances : sans eux, on le ferait répéter. */
  temoignages?: Temoignage[];
  days?: number;
  now?: Date;
}) {
  const t = await getT();
  const { recus, attendus } = fluxDeLaBande(positions, entries, days, now);
  if (!recus.length && !attendus.length) return null;
  const b = bilan([...recus, ...attendus]);

  const trois = (l: FluxSuivi[]) =>
    l
      .slice(0, 3)
      .map((f) => `${t(f.label)} · ${f.titre} · ${fmtDate(f.date, false)}`)
      .join(" · ") + (l.length > 3 ? ` · ${t("et {n} autres", { n: String(l.length - 3) })}` : "");

  return (
    <div className={styles.bloc}>
      {recus.length > 0 && (
        <div className={styles.strip}>
          <div>
            <b>{t("{m} FCFA reçus et disponibles", { m: fmt(Math.round(b.encaisse)) })}</b>
            <small>{trois(recus)}</small>
          </div>
          <div className={styles.acts}>
            <Link className="btn sm primary" href="/titres">
              {t("Replacer cette somme")}
            </Link>
            <Link className="btn sm" href="/moi/reinvestir">
              {t("Réinvestir automatiquement")}
            </Link>
          </div>
        </div>
      )}

      {attendus.length > 0 && (
        <div className={`${styles.strip} ${styles.attente}`}>
          <div>
            <b>{t("{m} FCFA échus et pas encore reçus", { m: fmt(Math.round(b.attendu)) })}</b>
            <small>
              {trois(attendus)}
              {b.retardMax >= 1 ? ` · ${t("le plus ancien depuis {n} jours", { n: b.retardMax })}` : ""}
            </small>
          </div>
          <div className={styles.acts}>
            {/* Rien à replacer tant que rien n'est arrivé, et le proposer serait
                mentir. Mais il y a quelque chose à DIRE, et c'est en dessous. */}
            <span className={styles.note}>{t("L'émetteur doit encore ces sommes, et le desk les suit.")}</span>
          </div>
        </div>
      )}

      {/* Le seul témoin, quand le compte-titres est tenu ailleurs. */}
      {attendus.length > 0 && <DireLeFlux flux={attendus.slice(0, 6)} deja={Object.fromEntries(temoignages.filter((x) => attendus.some((f) => f.cle === x.flowKey)).map((x) => [x.flowKey, x]))} />}
    </div>
  );
}

/**
 * Les deux listes de la bande : ce qui est arrivé, ce qui se fait attendre.
 *
 * La fenêtre porte sur la date d'échéance et non sur celle de l'encaissement :
 * c'est l'événement que le client a en tête. Un flux daté d'aujourd'hui n'y
 * paraît pas comme attendu, parce qu'il n'a pas encore pu atteindre son compte
 * et que le signaler en retard ferait passer l'application pour mal informée.
 */
export function fluxDeLaBande(positions: Position[], entries: CashEntry[], days: number, now = new Date()): { recus: FluxSuivi[]; attendus: FluxSuivi[] } {
  const lignes: LigneTenue[] = positions.map((p) => ({ intentId: p.intent.id, titre: p.offer.title, echus: p.echus, aVenir: p.flows }));
  const depuis = new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 10);
  const dans = suivre(lignes, entries, now).filter((f) => f.date >= depuis && f.amount > 0);
  return {
    recus: dans.filter((f) => f.etat === "encaisse").sort((a, b) => b.date.localeCompare(a.date)),
    attendus: dans.filter((f) => f.etat === "attendu" && (f.retardJours ?? 0) >= 1).sort((a, b) => b.date.localeCompare(a.date)),
  };
}
