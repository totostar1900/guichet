"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useT } from "@/i18n/client";
import { COMPANY } from "@/lib/config";
import { rankEntries, type SearchEntry } from "@/app/info/InfoSearch";
import { TOP_QUESTIONS, type GuideIndex } from "@/lib/guide-index-shared";
import { cachedGuideIndex, loadGuideIndex, readDoneLessons } from "@/lib/guide-index-client";
import { Presentation } from "@/components/mobile/Presentation";
import { Onboarding } from "@/components/mobile/Onboarding";
import styles from "@/components/AppMenu.module.css";

/**
 * LES TROIS MORCEAUX QUE LES DEUX FEUILLES SE PARTAGEAIENT.
 *
 * La recherche, le contact et les deux rejouables vivaient dans le « ⋮ », et
 * la feuille du compte ne les avait pas : sur un écran de bureau, qui n'avait
 * pas trouvé les trois points n'avait ni l'aide ni le numéro WhatsApp. Les
 * fondre dans une seule feuille demandait d'abord de les sortir d'ici, sinon
 * la fusion aurait copié quarante lignes de JSX au lieu de les déplacer.
 *
 * Ils gardent la feuille de style du « ⋮ » : c'est ce qui garantit que les
 * deux surfaces se ressemblent au pixel tant qu'elles coexistent, et il n'en
 * restera qu'une.
 */

const rien = () => () => {};
/** Yaoundé (UTC+1), du lundi au vendredi, 8 h à 17 h. */
const auDesk = () => {
  const d = new Date(new Date().getTime() + 60 * 60 * 1000);
  const jour = d.getUTCDay();
  const h = d.getUTCHours();
  return jour >= 1 && jour <= 5 && h >= 8 && h < 17;
};

/** L'index du Guide, chargé une fois à l'ouverture d'une feuille, et ce qu'on en tire. */
export function useGuideIndex(ouvert: boolean) {
  const [index, setIndex] = useState<GuideIndex | null>(cachedGuideIndex());
  const [done, setDone] = useState<string[]>([]);
  useEffect(() => {
    if (!ouvert) return;
    loadGuideIndex().then((i) => {
      setIndex(i);
      setDone(readDoneLessons(i.lessons.map((l) => l.key)));
    });
  }, [ouvert]);
  const first = index?.lessons.filter((l) => !l.section) ?? [];
  const course = index?.lessons.filter((l) => l.section) ?? [];
  const lues = first.filter((l) => done.includes(l.key)).length + course.filter((l) => done.includes(l.key)).length;
  const resume = course.find((l) => !done.includes(l.key));
  const top = index ? TOP_QUESTIONS.map((slug) => index.aide.find((r) => r.slug === slug)).filter((r): r is NonNullable<typeof r> => Boolean(r)) : [];
  return { index, lues, resume, top };
}

/** La recherche de l'aide, du glossaire et des éclairages. */
export function MenuRecherche({ index, close }: { index: GuideIndex | null; close: () => void }) {
  const t = useT();
  const router = useRouter();
  const [q, setQ] = useState("");
  const hits = useMemo(() => (index && q.trim().length >= 2 ? rankEntries(index.entries, q, 6).results.map((r) => r.e) : []), [index, q]);
  const ouvrir = (e: SearchEntry) => {
    close();
    router.push(e.href);
  };
  return (
    <>
      <label className={styles.search}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Une question, un mot… ex. coupon couru")} aria-label={t("Rechercher dans l'aide")} autoComplete="off" enterKeyHint="search" onKeyDown={(e) => e.key === "Enter" && hits[0] && ouvrir(hits[0])} />
        <small>{t("aide · glossaire · éclairages")}</small>
      </label>
      {q.trim().length >= 2 && (
        <div className={styles.hits} role="listbox">
          {hits.length === 0 && <span className={styles.none}>{index ? t("Aucun résultat") : t("Un instant…")}</span>}
          {hits.map((e) => (
            <button key={e.href + e.title} type="button" role="option" aria-selected={false} className={styles.hit} onClick={() => ouvrir(e)}>
              <em>{t(e.kind === "terme" ? "Définition" : e.kind === "lecon" ? "Éclairage" : e.kind === "outil" ? "Outil" : "Aide")}</em>
              <b>{e.title}</b>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/**
 * Les deux rejouables, côte à côte dans la grille.
 *
 * Ils ont été deux rangées pleine largeur une demi-journée, et c'était une
 * grammaire de trop : la feuille pose cinq bandes de tuiles, et deux rangées
 * au milieu cassaient la lecture pour deux choses qu'on ouvre une fois.
 */
export function MenuRejouables({ close }: { close: () => void }) {
  const t = useT();
  const [joue, setJoue] = useState<"presentation" | "onboarding" | null>(null);
  const lancer = (quoi: "presentation" | "onboarding") => () => {
    close();
    setJoue(quoi);
  };
  return (
    <>
      <div className={styles.tiles}>
        <button type="button" className={styles.tile} onClick={lancer("presentation")}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM10 8.5v7l5.5-3.5z" />
          </svg>
          <b>{t("Trente secondes")}</b>
          <small>{t("la présentation")}</small>
        </button>
        <button type="button" className={styles.tile} onClick={lancer("onboarding")}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 19V5l6 3v11zM14 16V4l6 3v11z" />
          </svg>
          <b>{t("Premiers pas")}</b>
          <small>{t("six écrans")}</small>
        </button>
      </div>
      {joue === "presentation" && <Presentation force onClose={() => setJoue(null)} />}
      {joue === "onboarding" && <Onboarding force onClose={() => setJoue(null)} />}
    </>
  );
}

/**
 * Nous joindre : WhatsApp d'abord, le numéro en grand, puis l'appel et
 * l'e-mail, l'adresse avec l'agrément, et les heures.
 */
export function MenuContact({ close, surFiche, compact }: { close: () => void; /** sur la fiche d'une ligne, le message part avec son nom */ surFiche?: boolean; /** dans la feuille du compte : deux tuiles et une rangée au lieu de la grande carte */ compact?: boolean }) {
  const t = useT();
  /* DEUX CHOSES QUE LE SERVEUR NE SAIT PAS : l'heure qu'il est chez le lecteur
     et la page qu'il regarde. Les calculer au rendu donnait un texte au
     serveur et un autre au navigateur, donc une divergence d'hydratation
     silencieuse ; les poser dans un effet rend deux fois pour rien. Le même
     mécanisme que le reste du menu : une lecture, pas un état. */
  const ouvertMaintenant = useSyncExternalStore(rien, auDesk, () => false);
  const ligne = useSyncExternalStore(rien, () => (surFiche ? document.title.replace(/\s*·\s*Guichet.*$/i, "") : undefined), () => undefined);
  const wa = `https://wa.me/${COMPANY.phone.replace(/\D/g, "")}?text=${encodeURIComponent(ligne ? t("Bonjour, je regarde {line} sur le Guichet et…", { line: ligne }) : t("Bonjour, j'ai une question sur le Guichet…"))}`;
  if (compact)
    return (
      <>
        <div className={styles.tiles}>
          <a className={styles.tile} href={wa} target="_blank" rel="noopener" onClick={close}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19.1L4 20z" />
            </svg>
            <b>WhatsApp</b>
            <small>{COMPANY.phone}</small>
            {ouvertMaintenant && <small className={styles.good}>{t("en ligne maintenant")}</small>}
          </a>
          <a className={styles.tile} href={`tel:${COMPANY.phone.replace(/\s/g, "")}`} onClick={close}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L14 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
            </svg>
            <b>{t("Appeler")}</b>
            <small>{t("lundi à vendredi, 8 h à 17 h")}</small>
          </a>
          <a className={styles.tile} href={`mailto:${COMPANY.email}`} onClick={close}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l9 6 9-6" />
            </svg>
            <b>{t("E-mail")}</b>
            <small>{COMPANY.email}</small>
            <small>{t("réponse sous un jour ouvré")}</small>
          </a>
          {/* L adresse n est pas un lien : elle se
              lit. La raison sociale et l'agrément vivent au pied de la
              feuille, qui ne défile pas. */}
          <span className={styles.tile}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11zM12 10m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0" />
            </svg>
            <b>{t("Nos bureaux")}</b>
            <small>{COMPANY.address}</small>
          </span>
        </div>
      </>
    );

  return (
    <>
      <a className={styles.waCard} href={wa} target="_blank" rel="noopener" onClick={close}>
        <span className={styles.waHead}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19.1L4 20z" />
          </svg>
          <b>WhatsApp</b>
        </span>
        <strong>{COMPANY.phone}</strong>
        <small>{t(ligne ? "un conseiller répond dans l'heure ouvrée, au sujet de cette ligne" : "un conseiller répond dans l'heure ouvrée")}</small>
        <span className={styles.waBtn}>{t("Écrire")}</span>
      </a>
      <div className={styles.contactPair}>
        <a className={styles.contactCard} href={`tel:${COMPANY.phone.replace(/\s/g, "")}`} onClick={close}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L14 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
          </svg>
          <b>{t("Appeler")}</b>
          <strong>{COMPANY.phone}</strong>
          <small>{t("lundi à vendredi, 8 h à 17 h")}</small>
        </a>
        <a className={styles.contactCard} href={`mailto:${COMPANY.email}`} onClick={close}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l9 6 9-6" />
          </svg>
          <b>{t("E-mail")}</b>
          <strong>{COMPANY.email}</strong>
          <small>{t("réponse sous un jour ouvré")}</small>
        </a>
      </div>
      <div className={styles.address}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11zM12 10m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0" />
        </svg>
        <span>
          <b>{COMPANY.legalName}</b>
          <small>{COMPANY.address}</small>
          <small>{t(COMPANY.licence)}</small>
        </span>
      </div>
      <div className={styles.hours}>
        <span>
          <b>{t("Ouvert")}</b> · {t("lundi à vendredi, 8 h à 17 h")}
        </span>
        {ouvertMaintenant && (
          <em>
            <i aria-hidden="true" />
            {t("en ligne maintenant")}
          </em>
        )}
      </div>
    </>
  );
}

/** Le pied légal, le même des deux côtés. */
export function MenuPied({ close, build }: { close: () => void; build?: string }) {
  const t = useT();
  return (
    <div className={styles.foot}>
      <span>
        {COMPANY.legalName} · {t("agrément COSUMAF")}
      </span>
      <span className={styles.footLinks}>
        <Link href="/info/mentions" onClick={close}>
          {t("Mentions")}
        </Link>
        <Link href="/info/aide#entretien" onClick={close}>
          {t("À propos")}
          {build ? ` · v${build}` : ""}
        </Link>
      </span>
    </div>
  );
}
