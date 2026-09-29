import { DeskNav } from "@/components/DeskNav";
import { BaremeForm, EmettreForm } from "./Formulaires";
import { apercuGarde } from "./apercu";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { loadBaremeGarde } from "@/lib/policy";
import { baremeOuvert, periodeDeCle, trimestrePrecedent } from "@/lib/domain/garde";
import { getT } from "@/i18n/server";
import { fmt, fmtDate } from "@/lib/format";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Droits de garde" };

/**
 * Conserver des titres, et ce que cela coûte.
 *
 * C'était le service rendu tous les jours et facturé nulle part : les positions
 * étaient suivies, aucune n'était tarifée. Tout est là maintenant, sauf le
 * prix, et c'est volontaire.
 *
 * LE BARÈME EST FERMÉ PAR DÉFAUT, comme le verrou des espèces l'est. Zéro point
 * de base : le calcul tourne, les avis s'émettent, et personne n'est prélevé.
 * Il s'ouvrira le jour où la maison aura arrêté son tarif. Un barème posé par
 * défaut « pour que ça marche » serait un prélèvement décidé par le code, et
 * cette décision n'appartient pas au code.
 *
 * On facture une période CLOSE, jamais celle qui court : un trimestre en cours
 * changerait encore, et un avis doit rester ce qu'il disait.
 */
export default async function GardePage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  await requireDesk("/desk/garde");
  const t = await getT();
  const sp = await searchParams;
  const r = repo();

  const aujourdHui = new Date().toISOString().slice(0, 10);
  const parDefaut = trimestrePrecedent(aujourdHui);
  const periode = (sp.t && periodeDeCle(sp.t)) || parDefaut;
  const bareme = await loadBaremeGarde();
  const ouvert = baremeOuvert(bareme);
  const [apercu, emis] = await Promise.all([apercuGarde(periode, bareme), r.listCustodyNotices({ period: periode.cle }).catch(() => [])]);

  const aEmettre = apercu.filter((c) => !c.dejaEmis);
  const aPrelever = Math.round(aEmettre.reduce((s, c) => s + c.droits.du, 0));
  const assiette = apercu.reduce((s, c) => s + c.droits.assietteMoyenne, 0);

  /* Les quatre trimestres clos les plus récents : au delà, une facturation
     rétroactive pose d'autres questions que celles d'un écran. */
  const choix = Array.from({ length: 4 }, (_, i) => {
    let p = parDefaut;
    for (let k = 0; k < i; k++) p = trimestrePrecedent(p.du);
    return p;
  });

  return (
    <>
      <DeskNav current="/desk/garde" />
      <div className={styles.page}>
        <header className={styles.head}>
          <div>
            <h1>{t("Droits de garde")}</h1>
            <p className="muted">
              {t(
                "Conserver des titres pour un client est un service rendu tous les jours. Le calcul, l'avis et le prélèvement sont ici ; le prix appartient à la maison, et tant qu'il n'est pas arrêté rien n'est facturé.",
              )}
            </p>
          </div>
        </header>

        {/* L'état du verrou, avant tout le reste : c'est la première chose à
            savoir en arrivant sur cette page. */}
        <section className={`panel ${ouvert ? styles.ouvert : styles.ferme}`}>
          <div className="panel-h">
            <h2>{t("Le barème")}</h2>
            <span className="muted">{ouvert ? <span className="st reglee">{t("ouvert")}</span> : <span className="st transmise">{t("fermé")}</span>}</span>
          </div>
          <div className={styles.pb}>
            {ouvert ? (
              <p className={styles.etat}>
                {t("{b} points de base par an sur l'assiette de conservation, plancher {p} FCFA par trimestre, franchise {f} FCFA.", {
                  b: bareme.bps,
                  p: fmt(bareme.minimum),
                  f: fmt(bareme.franchise),
                })}
              </p>
            ) : (
              <p className={styles.etat}>
                <b>{t("Aucun tarif n'est arrêté, et rien n'est facturé.")}</b>{" "}
                {t(
                  "Le calcul tourne quand même : la prévisualisation ci-dessous montre ce que chaque client devrait, et les avis s'émettent à zéro. Poser un taux ici est une décision de maison, pas un réglage.",
                )}
              </p>
            )}
            <BaremeForm bareme={bareme} />
          </div>
        </section>

        <section className="panel">
          <div className="panel-h">
            <h2>{t("La période")}</h2>
            <span className="muted">{t("du {a} au {b}", { a: fmtDate(periode.du), b: fmtDate(periode.au) })}</span>
          </div>
          <div className={styles.pb}>
            <div className={styles.onglets}>
              {choix.map((p) => (
                <a key={p.cle} href={`/desk/garde?t=${p.cle}`} className={p.cle === periode.cle ? styles.actif : undefined}>
                  {p.cle}
                </a>
              ))}
            </div>
            <p className={styles.note}>
              {t("On facture un trimestre clos, jamais celui qui court : une période en cours changerait encore, et un avis doit rester ce qu'il disait le jour de son émission.")}
            </p>
          </div>
        </section>

        <div className={styles.band}>
          <div>
            <span>{t("Clients avec des titres")}</span>
            <b>{apercu.length}</b>
          </div>
          <div>
            <span>{t("Assiette moyenne")}</span>
            <b>{fmt(Math.round(assiette))}</b>
          </div>
          <div>
            <span>{t("Avis déjà émis")}</span>
            <b>{emis.length}</b>
          </div>
          <div>
            <span>{t("Reste à émettre")}</span>
            <b>{aEmettre.length}</b>
          </div>
          <div>
            <span>{t("À prélever")}</span>
            <b className={aPrelever ? styles.chiffre : undefined}>{fmt(aPrelever)}</b>
          </div>
        </div>

        <section className="panel">
          <div className="panel-h">
            <h2>{t("Ce que chaque client devrait")}</h2>
            <span className="muted">{t("prévisualisation : rien n'est écrit tant qu'on n'émet pas")}</span>
          </div>
          {!apercu.length ? (
            <div className="empty">{t("Aucun client ne tenait de titres pendant cette période.")}</div>
          ) : (
            <div className="scroll-x">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t("Client")}</th>
                    <th className="r">{t("Lignes")}</th>
                    <th className="r">{t("Assiette moyenne")}</th>
                    <th className="r">{t("Brut")}</th>
                    <th className="r">{t("Dû")}</th>
                    <th>{t("Pourquoi")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {apercu.map((c) => (
                    <tr key={c.clientId}>
                      <td>{c.nom}</td>
                      <td className="r">{c.droits.lignes.filter((l) => l.jours > 0 && !l.exoneree).length}</td>
                      <td className="r">{fmt(Math.round(c.droits.assietteMoyenne))}</td>
                      {/* Le prorata se lit sur le brut : le plancher peut
                          l'effacer, et n'exposer que le dû ferait croire qu'il
                          n'a pas fonctionné. */}
                      <td className="r">{fmt(Math.round(c.droits.brut))}</td>
                      <td className="r">
                        <b>{fmt(Math.round(c.droits.du))}</b>
                        {c.droits.plancherApplique && <span className={styles.pm}> {t("plancher")}</span>}
                      </td>
                      <td className={styles.wrap}>
                        <span className="muted">{c.droits.raison ? t(c.droits.raison) : t("calculé au prorata des jours gardés")}</span>
                      </td>
                      <td>{c.dejaEmis ? <span className="st reglee">{t("avis émis")}</span> : <span className="st transmise">{t("à émettre")}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className={styles.pb}>
            <EmettreForm period={periode.cle} aEmettre={aEmettre.length} aPrelever={aPrelever} />
            <p className={styles.note}>
              {t(
                "Émettre est irréversible : un avis ne se retire pas, et un prélèvement se répare par un mouvement inverse au journal plutôt que par un effacement. Un avis à zéro s'émet quand même : il dit au client que sa conservation a été calculée et ne lui coûte rien, et il empêche qu'un barème ouvert plus tard rattrape un trimestre déjà arrêté.",
              )}
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
