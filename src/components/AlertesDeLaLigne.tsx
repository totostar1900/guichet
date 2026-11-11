"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useT } from "@/i18n/client";
import { Sheet } from "@/components/mobile/Sheet";
import { Select } from "@/components/ui/Select";
import { useBulle } from "@/components/mobile/Bulle";
import { armerUnSeuil, annulerUnSeuil, suivreLaSerie } from "@/app/moi/alertes-actions";
import { groupDigits } from "@/lib/ui/grouped";
import { fmt } from "@/lib/format";
import type { MetricDeSeuil, SensDeSeuil } from "@/lib/domain/alertes";
import styles from "./WatchButton.module.css";
import propres from "./AlertesDeLaLigne.module.css";

/**
 * LA CLOCHE DE LA FICHE : DEUX ALERTES, UNE FEUILLE (11 novembre 2026, planche « Alertes de séance et de seuil », 1B et 2A).
 *
 * Une séance propose « me prévenir de la prochaine » (la série : même Trésor, même instrument, toutes durées) ; une ligne qui porte un chiffre propose un seuil — au-dessus ou en dessous d'un niveau, proposé à ±5 % du chiffre du jour.
 * Le seuil sonne une fois, puis s'éteint. La cloche est pleine quand une alerte est armée.
 */
export interface SeuilProps {
  metric: MetricDeSeuil;
  nom: string;
  valeur: number;
  unite: string;
  actives: { id: string; sens: SensDeSeuil; value: number }[];
  plafondAtteint: boolean;
}

const dit = (unite: string, v: number) => (unite === "%" ? `${v.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %` : `${fmt(v)} FCFA`);

/** Le niveau proposé : 5 % sous le chiffre pour un cours ou une valeur liquidative, 5 % au-dessus pour un rendement. */
const proposition = (metric: MetricDeSeuil, valeur: number, sens: SensDeSeuil) => {
  const f = sens === "en_dessous" ? 0.95 : 1.05;
  const v = valeur * f;
  return metric === "rendement" ? String(Math.round(v * 100) / 100).replace(".", ",") : groupDigits(String(Math.round(v)));
};

export function AlertesDeLaLigne({ offerId, signedIn, serie, seuil }: { offerId: string; signedIn: boolean; serie?: { label: string; suivie: boolean } | null; seuil?: SeuilProps | null }) {
  const t = useT();
  const { dire } = useBulle();
  const [ouvert, setOuvert] = useState(false);
  const [suivie, setSuivie] = useState(serie?.suivie ?? false);
  const [actives, setActives] = useState(seuil?.actives ?? []);
  const sensParDefaut: SensDeSeuil = seuil?.metric === "rendement" ? "au_dessus" : "en_dessous";
  const [sens, setSens] = useState<SensDeSeuil>(sensParDefaut);
  const [texte, setTexte] = useState(seuil ? proposition(seuil.metric, seuil.valeur, sensParDefaut) : "");
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const armee = suivie || actives.length > 0;
  const cloche = (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
  );
  if (!serie && !seuil) return null;
  if (!signedIn) {
    return (
      <Link className={styles.star} href={`/connexion?next=${encodeURIComponent(`/offres/${offerId}`)}`} title={t("Connectez-vous pour armer une alerte")} aria-label={t("Alertes")}>
        {cloche}
      </Link>
    );
  }
  return (
    <>
      <button type="button" className={`${styles.star} ${armee ? styles.on : ""}`} aria-haspopup="dialog" aria-pressed={armee} aria-label={t("Alertes")} title={t("Alertes")} onClick={() => setOuvert(true)}>
        {cloche}
      </button>
      <Sheet open={ouvert} onClose={() => setOuvert(false)} title={t("Alertes")}>
        <div className={propres.corps}>
          {serie && (
            <section className={propres.bloc}>
              <b>{t("Me prévenir de la prochaine séance")}</b>
              <small>{t("Dès qu'une nouvelle {l} est annoncée, toutes durées.", { l: serie.label })}</small>
              <button
                type="button"
                className={`btn sm ${suivie ? "ghost" : "primary"}`}
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await suivreLaSerie(offerId, !suivie);
                    if (res.ok) {
                      setSuivie(Boolean(res.suivie));
                      dire(res.suivie ? t("Série suivie : vous serez prévenu de la prochaine {l}.", { l: serie.label }) : t("Série non suivie : plus de message pour {l}.", { l: serie.label }));
                    } else dire(t(res.error));
                  })
                }
              >
                {suivie ? t("Ne plus prévenir") : t("Me prévenir")}
              </button>
            </section>
          )}
          {seuil && (
            <section className={propres.bloc}>
              <b>{t("Alerte de seuil")}</b>
              <small>{t("{nom} actuel : {v}", { nom: t(seuil.nom), v: dit(seuil.unite, seuil.valeur) })}</small>
              {actives.length > 0 && (
                <ul className={propres.actives}>
                  {actives.map((a) => (
                    <li key={a.id}>
                      <span>{t(a.sens === "au_dessus" ? "au-dessus de {v}" : "en dessous de {v}", { v: dit(seuil.unite, a.value) })}</span>
                      <button
                        type="button"
                        className="btn sm ghost"
                        disabled={pending}
                        onClick={() =>
                          start(async () => {
                            const res = await annulerUnSeuil(a.id);
                            if (res.ok) {
                              setActives(actives.filter((x) => x.id !== a.id));
                              dire(t("Alerte annulée."));
                            } else dire(t(res.error));
                          })
                        }
                      >
                        {t("Annuler")}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {seuil.plafondAtteint ? (
                <small>{t("Vous avez atteint le nombre maximal d'alertes de seuil actives : annulez-en une pour en armer une autre.")}</small>
              ) : (
                <form
                  className={propres.form}
                  onSubmit={(e) => {
                    e.preventDefault();
                    setErreur(null);
                    start(async () => {
                      const res = await armerUnSeuil(offerId, sens, texte);
                      if (res.ok) {
                        const valeur = Number(texte.replace(/[\s  ]/g, "").replace(",", "."));
                        setActives([...actives, { id: `${Date.now()}`, sens, value: valeur }]);
                        dire(t("Alerte armée : vous serez prévenu une fois, quand le niveau est franchi."));
                      } else setErreur(t(res.error));
                    });
                  }}
                >
                  <Select
                    block
                    name="sens"
                    label={t("Me prévenir quand le chiffre")}
                    value={sens}
                    onChange={(v) => {
                      const s = v as SensDeSeuil;
                      setSens(s);
                      setTexte(proposition(seuil.metric, seuil.valeur, s));
                    }}
                    options={[
                      { value: "en_dessous", label: t("passe en dessous") },
                      { value: "au_dessus", label: t("passe au-dessus") },
                    ]}
                  />
                  <label className="field">
                    {t("Niveau ({u})", { u: seuil.unite })}
                    <input inputMode="decimal" value={texte} onChange={(e) => setTexte(seuil.metric === "rendement" ? e.target.value : groupDigits(e.target.value.replace(/\D/g, "")))} />
                  </label>
                  {erreur && <p className={propres.erreur}>{erreur}</p>}
                  <button type="submit" className="btn primary sm" disabled={pending}>
                    {t("Armer l'alerte de seuil")}
                  </button>
                </form>
              )}
              <small>{t("L'alerte sonne une fois, puis s'éteint ; vous la remettez depuis vos lignes suivies.")}</small>
            </section>
          )}
        </div>
      </Sheet>
    </>
  );
}
