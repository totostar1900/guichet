import { repo } from "@/lib/data";
import { baremeOuvert } from "@/lib/domain/garde";
import { fourchetteDesDroits, GRATUITS } from "@/lib/domain/tarifs";
import { fraisLusParLeClient, type LigneDeFraisClient } from "@/lib/domain/frais";
import { loadBaremeDeFrais, loadBaremeGarde, loadTarifs } from "@/lib/policy";
import { fmt, fmtDate, fmtPct } from "@/lib/format";
import { getT } from "@/i18n/server";
import styles from "./page.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Ce que vous payez") };
}

/**
 * L'ANNEXE TARIFAIRE, PUBLIQUE.
 *
 * L'article 6 de la convention la cite depuis le début : « les conditions
 * tarifaires applicables sont celles de l'annexe tarifaire remise par le
 * conseiller ». Elle n'existait pas. Un texte opposable renvoyait donc à un
 * document que personne n'avait écrit, et une promesse de cette espèce ne se
 * voit que le jour où un client la réclame.
 *
 * ELLE SE CALCULE, ELLE NE S'ÉCRIT PAS. Le barème de garde vient de sa clef
 * de référentiel, la fourchette des droits d'entrée vient des fonds
 * eux-mêmes, les frais du client viennent du barème des frais. Une annexe écrite en
 * dur serait vraie le jour de sa rédaction et fausse le mois suivant, et
 * c'est la seule page du site où cet écart se paie en réclamation.
 *
 * ELLE N'EST PAS UNE VITRINE, et c'est une décision du dirigeant. Un prix
 * mis en avant devient un argument, et la maison n'en fait pas un : l'annexe
 * informe un client qui la cherche, depuis ses Documents, là où vivent déjà
 * sa convention et ses avis. Elle n'est donc ni publique, ni dans la barre du
 * guide, et rien ne la pousse.
 *
 * CE QUI NE SE FACTURE PAS Y FIGURE AUSSI, et ce n'est pas du remplissage :
 * un service absent de la liste finit par être réclamé un jour, et c'est
 * alors la parole du client contre la nôtre.
 */
export default async function TarifsPage() {
  const t = await getT();
  const [tarifs, bareme, offres, frais] = await Promise.all([loadTarifs(), loadBaremeGarde(), repo().listOffers().catch(() => []), loadBaremeDeFrais()]);
  const fonds = offres.filter((o) => o.kind === "FONDS" && !o.hidden && o.fund?.distributed).map((o) => o.fund!);
  const droits = fourchetteDesDroits(fonds);
  const jour = new Date().toISOString().slice(0, 10);
  const lignes = fraisLusParLeClient(frais, jour);
  const ligne = (cle: LigneDeFraisClient["cle"]) => lignes.find((l) => l.cle === cle);

  /* Le même mot partout : « 0 » se lit comme un oubli, « aucune » se lit comme une position. */
  const rien = t("Aucune");

  /* LE CLIENT LIT CE QU'IL COUVRE, ET LE MOT « FRAIS ». Jamais qui perçoit quoi : la destination d'un frais n'est pas écrite ici
     (décision du 14 novembre 2026). Une règle dont la date n'est pas arrivée se lit avec sa date, jamais comme déjà due. */
  const dit = (l: LigneDeFraisClient): string => {
    const taux = `${fmtPct(l.pct, 2)} ${t("du montant")}${l.min > 0 ? ` · ${t("minimum {m} FCFA", { m: fmt(l.min) })}` : ""}${l.max > 0 ? ` · ${t("plafond {m} FCFA", { m: fmt(l.max) })}` : ""}`;
    return l.enVigueur ? taux : `${taux} · ${t("à partir du {d}", { d: fmtDate(l.effetLe) })}`;
  };
  const frais_ = (...ls: (LigneDeFraisClient | undefined)[]): string[] => ls.filter((l): l is LigneDeFraisClient => Boolean(l)).map(dit);

  const entree = droits
    ? droits.min === droits.max
      ? t("Droits d'entrée du fonds : {p}", { p: fmtPct(droits.min, 2) })
      : t("Droits d'entrée du fonds, de {a} à {b} selon le fonds, indiqués sur sa fiche", { a: fmtPct(droits.min, 2), b: fmtPct(droits.max, 2) })
    : t("Les droits d'entrée figurent sur la fiche de chaque fonds.");
  const achat = ligne("titres.achat");
  const vente = ligne("titres.vente");
  const bourse = [achat ? `${t("Achat")} : ${dit(achat)}` : "", vente ? `${t("Vente")} : ${dit(vente)}` : "", t("Frais de marché, s'il en est appliqué")].filter(Boolean);

  const rangees: { op: string; frais: string[] }[] = [
    { op: t("Investir dans un fonds"), frais: [...frais_(ligne("fonds.souscription")), entree] },
    { op: t("Sortir d'un fonds"), frais: [...frais_(ligne("fonds.rachat")), t("Droits de sortie du fonds, le cas échéant")] },
    { op: t("Passage d'un fonds à l'autre"), frais: [t("Les frais de sortie du premier, puis les frais d'entrée du second")] },
    { op: t("Adjudications et émissions"), frais: frais_(ligne("adjudication.souscription")).length ? frais_(ligne("adjudication.souscription")) : [rien] },
    { op: t("Acheter et vendre en bourse"), frais: bourse },
  ];

  return (
    <Glissement>
      <div className={styles.page}>
        <EnTete
          surTitre={t("Annexe tarifaire")}
          titre={t("Ce que vous payez")}
          phrase={t("Tout ce qui se facture est ici, et ce qui ne se facture pas y est aussi : un service absent d'une liste finit par être réclamé un jour. Les montants sont en francs CFA, hors fiscalité.")}
        />

        <section className={styles.bloc}>
          <h2>{t("À l'opération")}</h2>
          <p className={styles.sous}>{t("Les frais que vous couvrez au moment où vous agissez, par nature d'opération.")}</p>
          <div className="scroll-x">
            <table className={styles.tbl}>
              <thead>
                <tr>
                  <th>{t("Ce que vous faites")}</th>
                  <th>{t("Frais")}</th>
                </tr>
              </thead>
              <tbody>
                {rangees.map((r) => (
                  <tr key={r.op}>
                    <td>{r.op}</td>
                    <td className={styles.tiers}>
                      {r.frais.map((f) => (
                        <div key={f}>{f}</div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.bloc}>
          <h2>{t("Dans le temps")}</h2>
          <p className={styles.sous}>{t("Ce qui se facture parce que le service dure, et non parce que vous agissez.")}</p>
          <div className="scroll-x">
            <table className={styles.tbl}>
              <thead>
                <tr>
                  <th>{t("Ce que nous assurons")}</th>
                  <th>{t("Ce que cela coûte")}</th>
                  <th>{t("Comment il se calcule")}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{t("Conservation de vos titres")}</td>
                  <td className={styles.prix}>{baremeOuvert(bareme) ? t("{n} points de base par an", { n: String(bareme.bps) }) : rien}</td>
                  <td className={styles.tiers}>
                    {baremeOuvert(bareme)
                      ? t("Sur la valeur de conservation, au prorata des jours gardés{f}.", { f: bareme.franchise > 0 ? t(", en deçà de {m} FCFA rien n'est dû", { m: fmt(bareme.franchise) }) : "" })
                      : t("Le barème n'est pas ouvert : aucun droit de garde n'est prélevé aujourd'hui.")}
                  </td>
                </tr>
                <tr>
                  <td>{t("Tenue de votre compte-titres")}</td>
                  <td className={styles.prix}>{rien}</td>
                  <td className={styles.tiers}>{t("Comprise dans le service")}</td>
                </tr>
                <tr>
                  <td>{t("Votre provision chez nous")}</td>
                  <td className={styles.prix}>{rien}</td>
                  <td className={styles.tiers}>{t("Aucun frais de tenue, aucun frais d'inactivité.")}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.bloc}>
          <h2>{t("Ce qui ne se facture pas")}</h2>
          <p className={styles.sous}>{t("Nommé ici pour que ce soit opposable, et non sous-entendu.")}</p>
          <ul className={styles.gratuits}>
            {GRATUITS.map((g) => (
              <li key={g}>
                <span>{t(g)}</span>
                <b className={styles.prix}>{rien}</b>
              </li>
            ))}
            {tarifs.duplicata > 0 && (
              <li>
                <span>{t("Duplicata d'un document déjà émis")}</span>
                <b className={styles.prix}>{t("{m} FCFA", { m: fmt(tarifs.duplicata) })}</b>
              </li>
            )}
          </ul>
        </section>

        {/* LA MOITIÉ HONNÊTE. Ce que le client paie et qui ne nous revient pas
            pèse plus lourd que tout le reste de cette page : les frais de
            gestion d'un fonds se prélèvent dans la valeur liquidative, sans
            qu'on les voie passer. Les taire ferait de cette annexe une demi-
            vérité, et la comparaison honnête des fonds est une position de la
            maison depuis le début. */}
        <section className={styles.apart}>
          <h2>{t("Les frais d'un fonds, dans sa valeur")}</h2>
          <p>
            {t(
              "Les frais de gestion d'un fonds sont prélevés chaque année dans sa valeur liquidative. Vous ne les voyez pas passer, et ils réduisent pourtant votre rendement plus sûrement que tout le reste de cette page. La fiche de chaque fonds les indique.",
            )}
          </p>
          <p>{t("La fiscalité dépend de l'instrument et de votre État de résidence. Les rendements affichés sont bruts : ce que vous touchez est après retenue.")}</p>
        </section>

        <p className={styles.pied}>
          {tarifs.effetLe ? t("Tarifs en vigueur depuis le {d}.", { d: fmtDate(tarifs.effetLe) }) : t("Tarifs en vigueur ce jour.")}{" "}
          {t("Toute modification vous est notifiée trente jours avant son application, comme le prévoit l'article 6 de votre convention.")}
        </p>
      </div>
    </Glissement>
  );
}
