"use client";

import { useMemo, useState } from "react";
import { useT } from "@/i18n/client";
import { Select } from "@/components/ui/Select";
import { fold } from "@/lib/text";
import { displayYield } from "@/lib/domain/status";
import { CarteDeSeanceClose, type EntreeClose } from "./CarteDeSeanceClose";
import styles from "./ListeDesSeancesCloses.module.css";

/**
 * UNE SEULE LISTE DE SÉANCES CLOSES, QUI SE CHERCHE, SE FILTRE ET SE RANGE (9 novembre 2026, soir).
 *
 * Les résultats confirmés et les lignes closes du catalogue sont une liste, de la même carte. La recherche ignore les accents et lit le nom, le Trésor, le code d'émission et la durée ; les filtres ne proposent que ce que la liste contient (un Trésor
 * absent n'est pas une case vide) ; le rangement dit ce qu'il range. Vingt séances d'abord, « Voir plus » pour la suite : une recherche ou un filtre ne tronque rien tant qu'il reste des séances à montrer.
 */
const PAR_PAGE = 20;
type Tri = "recent" | "ancien" | "taux" | "pays";

const instrumentDe = (e: EntreeClose): string => (e.type === "resultat" ? e.s.instrument : e.o.kind === "RACHAT" ? "Rachat" : e.o.kind);
const paysDe = (e: EntreeClose) => (e.type === "resultat" ? e.s.country : e.o.country);
const jourDe = (e: EntreeClose) => (e.type === "resultat" ? e.s.sessionOn : e.o.deadlineAt.slice(0, 10));

export function ListeDesSeancesCloses({ entrees }: { entrees: EntreeClose[] }) {
  const t = useT();
  const [q, setQ] = useState("");
  const [instrument, setInstrument] = useState("");
  const [pays, setPays] = useState("");
  const [tri, setTri] = useState<Tri>("recent");
  const [nb, setNb] = useState(PAR_PAGE);

  const lignes = useMemo(() => {
    return entrees.map((e) => {
        const o = e.type === "ligne" ? e.o : e.offre;
        const taux = e.type === "resultat" ? (e.s.rendement ?? (e.s.instrument === "BTA" ? e.s.rateAvg : undefined)) : displayYield(e.o).pct;
        const texte = fold([instrumentDe(e), e.type === "resultat" ? e.s.tenor : e.o.title, paysDe(e), e.type === "ligne" ? e.o.countryName : "", e.type === "resultat" ? e.s.codeEmission : "", o?.isin, o?.title].filter(Boolean).join(" "));
        return { e, taux: taux ?? null, texte, jour: jourDe(e), pays: paysDe(e), instrument: instrumentDe(e) };
      });
  }, [entrees]);
  const instruments = [...new Set(lignes.map((l) => l.instrument))];
  const paysPresents = [...new Set(lignes.map((l) => l.pays))].sort((a, b) => a.localeCompare(b));
  const filtre = fold(q.trim());
  const gardees = lignes
    .filter((l) => (!instrument || l.instrument === instrument) && (!pays || l.pays === pays) && (!filtre || l.texte.includes(filtre)))
    .sort((a, b) => {
      if (tri === "ancien") return a.jour < b.jour ? -1 : a.jour > b.jour ? 1 : 0;
      if (tri === "taux") return (b.taux ?? -1) - (a.taux ?? -1);
      if (tri === "pays") return a.pays.localeCompare(b.pays) || (a.jour < b.jour ? 1 : -1);
      return a.jour < b.jour ? 1 : a.jour > b.jour ? -1 : 0;
    });
  const actif = Boolean(filtre || instrument || pays);
  const efface = () => {
    setQ("");
    setInstrument("");
    setPays("");
    setNb(PAR_PAGE);
  };

  return (
    <div className={styles.liste}>
      <div className={styles.barre}>
        <div className={styles.rangee}>
        <div className={styles.choix} role="group" aria-label={t("Type de titre")}>
          {["", ...instruments].map((k) => (
            <button
              key={k || "tous"}
              type="button"
              aria-pressed={instrument === k}
              onClick={() => {
                setInstrument(k);
                setNb(PAR_PAGE);
              }}
            >
              {k ? t(k) : t("Tout")}
            </button>
          ))}
        </div>
        <label className={styles.recherche}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={q}
            placeholder={t("Recherche")}
            aria-label={t("Rechercher une séance")}
            onChange={(ev) => {
              setQ(ev.target.value);
              setNb(PAR_PAGE);
            }}
          />
        </label>
        </div>
        <div className={styles.selecteurs}>
          <Select
            value={pays}
            onChange={(v) => {
              setPays(v);
              setNb(PAR_PAGE);
            }}
            label={t("Trésor")}
            placeholder={t("Tous les Trésors")}
            options={[{ value: "", label: t("Tous les Trésors") }, ...paysPresents.map((p) => ({ value: p, label: t(p) }))]}
            fixe
            compact
          />
          <Select
            value={tri}
            onChange={(v) => setTri(v as Tri)}
            label={t("Ranger par")}
            cherchable={false}
            options={[
              { value: "recent", label: t("Plus récentes") },
              { value: "ancien", label: t("Plus anciennes") },
              { value: "taux", label: t("Rendement, du plus haut") },
              { value: "pays", label: t("Trésor") },
            ]}
            fixe
            compact
          />
        </div>
      </div>
      <p className={styles.compte} aria-live="polite">
        {t("{n} séances", { n: String(gardees.length) })}
        {actif && (
          <>
            {" · "}
            <button type="button" className={styles.efface} onClick={efface}>
              {t("Effacer")}
            </button>
          </>
        )}
      </p>
      {gardees.length === 0 ? (
        <div className="empty">{t("Aucune séance ne correspond à cette recherche.")}</div>
      ) : (
        gardees.slice(0, nb).map((l) => <CarteDeSeanceClose key={l.e.type === "resultat" ? l.e.s.id : l.e.o.id} e={l.e} />)
      )}
      {gardees.length > nb && (
        <button type="button" className={styles.plus} onClick={() => setNb(nb + PAR_PAGE)}>
          {t("Voir plus de séances")}
        </button>
      )}
    </div>
  );
}
