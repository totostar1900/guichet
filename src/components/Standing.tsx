"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useDates, useT } from "@/i18n/client";
import { Select } from "@/components/ui/Select";
import { groupDigits, groupedInput } from "@/lib/ui/grouped";
import { fmt, parseAmount } from "@/lib/format";
import { premierVersement } from "@/lib/domain/standing";
import { createStandingAction, stopStandingAction, type StandingResult } from "@/app/moi/standing-actions";
import { ModifierInstruction, type FondsChoix } from "./ModifierInstruction";
import styles from "./Standing.module.css";

function Msg({ state }: { state: StandingResult | null }) {
  if (!state) return null;
  return <small className={state.ok ? styles.ok : styles.err}>{state.ok ? state.message : state.error}</small>;
}

/**
 * Programmer un versement mensuel.
 *
 * Le formulaire ne demande que ce qui décidera des versements à venir : combien,
 * quel jour, jusqu'à quand, et ce qu'on fait si un mois l'exécution est
 * impossible. La destination n'y figure pas comme un choix : c'est la ligne
 * qu'on regarde, et elle est fixée à la signature. C'est une contrainte
 * réglementaire et non une simplification : le jour où la maison choisirait la
 * destination d'un versement, elle gérerait au lieu d'exécuter.
 *
 * La dernière question est celle qu'on oublie, et c'est la plus importante :
 * décider d'avance ce qui se passe quand ça bloque. Un fonds suspendu, un
 * minimum relevé. Le client répond maintenant, sinon quelqu'un devra répondre à
 * sa place le jour venu.
 */
/**
 * LE CHOIX DU FONDS ENTRE DANS LE FORMULAIRE, et c'est ce qui lui permet de
 * vivre ailleurs que sur la page d'un fonds.
 *
 * Il n'existait que là : pour mettre une épargne en place, il fallait avoir
 * déjà trouvé le fonds, ouvert sa fiche, puis sa page d'intention. Le service
 * « Épargne programmée » renvoyait donc à la LISTE des fonds, à charge pour
 * le client de deviner la suite. Avec « fonds », le formulaire porte sa
 * propre première question, et la page dédiée devient possible.
 */
export function StandingForm({
  offerId,
  minimum,
  unit = "FCFA",
  fonds,
  vl,
  aujourdhui,
}: {
  offerId?: string;
  minimum: number;
  unit?: string;
  fonds?: { id: string; title: string; min: number; vl?: number }[];
  /** La valeur liquidative de la ligne visée, pour dire ce qu'un versement achète. */
  vl?: number;
  /**
   * Le jour d'aujourd'hui, posé par le serveur.
   *
   * « new Date() » pendant un rendu donne une valeur au serveur et une autre
   * au navigateur : c'est une discordance d'hydratation la nuit du passage à
   * minuit. La maison s'est déjà fait prendre là-dessus sur la fenêtre d'un
   * arbitrage.
   */
  aujourdhui?: string;
}) {
  const { fmtDate } = useDates();
  const t = useT();
  const [state, action, pending] = useActionState<StandingResult | null, FormData>(createStandingAction, null);
  const [choisi, setChoisi] = useState(offerId ?? fonds?.[0]?.id ?? "");
  const plancher = fonds ? (fonds.find((f) => f.id === choisi)?.min ?? 0) : minimum;
  const valeur = fonds ? fonds.find((f) => f.id === choisi)?.vl : vl;
  /* Le montant est tenu en etat : il se regroupe pendant la frappe — ET DÈS LE
     DÉPART. Il s'ouvrait sur « 100000 », six chiffres collés dans une case de
     douze pixels : c'est exactement le moment où l'on compte les zéros, et
     c'est le défaut que « grouped.ts » explique sur vingt lignes avant de le
     corriger partout ailleurs. */
  const [montant, setMontant] = useState(minimum ? groupDigits(String(minimum)) : "");
  /* LE JOUR DU MOIS, TENU EN ÉTAT parce qu'une grille n'a pas de valeur par
     elle-même : c'est un champ caché qui part au serveur. */
  const [jour, setJour] = useState(5);
  /* LES TROIS DERNIÈRES DÉCISIONS, TENUES EN ÉTAT POUR QUE LE RÉCAPITULATIF
     PUISSE LES REDIRE. Elles vivaient dans le navigateur, chacune pour soi :
     lisibles à l'écran, invisibles au moment où l'on signe. */
  const [jusquau, setJusquau] = useState("");
  const [bloque, setBloque] = useState("passer");
  const [reglement, setReglement] = useState("virement");
  /**
   * DEUX ÉCRANS, ET LE SECOND NE DEMANDE RIEN.
   *
   * ÉCARTÉ LE 29 OCTOBRE 2026 PUIS DEMANDÉ : j'avais mis les conséquences sous
   * la main — ce que le versement fait sur douze mois, quand tombe le premier —
   * et gardé un seul écran, en jugeant qu'elles suffisaient au moment de
   * décider. Elles suffisent à DÉCIDER ; elles ne suffisent pas à SIGNER.
   *
   * Un versement programmé court jusqu'à ce qu'on l'arrête, et il porte six
   * décisions dont trois se prennent en bas de l'écran — la date de fin, ce
   * qu'on fait si un mois bloque, et comment l'argent arrive. Au moment
   * d'appuyer, les trois premières sont sorties du champ de vision. Le
   * récapitulatif les remet toutes les six côte à côte, et il ne demande rien
   * de neuf : c'est sa valeur, on n'y relit que ce qu'on a déjà dit.
   */
  const [etape, setEtape] = useState<1 | 2>(1);
  const verse = parseAmount(montant);
  const parts = valeur && valeur > 0 && verse > 0 ? verse / valeur : 0;
  if (state?.ok) {
    return (
      <div className={styles.done}>
        <b>{state.message}</b>
        {/* UNE SEULE SUITE QUAND LE MANDAT ATTEND. « Voir mes versements
            programmés » se tenait à côté de « Signer le mandat » : deux
            portes au moment où il n'y a qu'une chose à finir, et la plus
            facile des deux ne finit rien. Le versement est posé mais ne
            partira pas sans le mandat ; la page ne propose donc que lui.
            Sans mandat à signer, le renvoi à la liste reprend sa place. */}
        {state.versLeMandat ? (
          <Link className="btn primary sm" href={state.versLeMandat}>
            {t("Signer le mandat de prélèvement")}
          </Link>
        ) : (
          <Link href="/moi/epargne">{t("Voir mes versements programmés")} →</Link>
        )}
      </div>
    );
  }
  return (
    <form action={action} data-at={etape} className={styles.form}>
      <div data-step="1">
      {fonds ? (
        <label className="field">
          {t("Vers quel fonds")}
          <Select block name="offerId" value={choisi} onChange={setChoisi} options={fonds.map((f) => ({ value: f.id, label: f.title }))} />
        </label>
      ) : (
        <input type="hidden" name="offerId" value={offerId} />
      )}
      {/* LE CHIFFRE QU'ON ÉCRIT DE SA MAIN, ici aussi. Un versement mensuel est
          l'engagement le plus long du guichet, et il se tapait dans une case de
          douze pixels — plus petite que la phrase qui l'explique. */}
      <label className={`field ${styles.carteDuChiffre} ${styles.chiffreTape}`}>
        {t("Montant du versement")} : {unit}
        {/* Les milliers se séparent pendant la frappe. Le champ n'est plus de
            type « number » : un champ numérique refuse les espaces, donc il
            refuserait son propre affichage. */}
        <input name="amount" value={montant} {...groupedInput(setMontant)} inputMode="numeric" autoComplete="off" required />
        {/* CE QUE ÇA FAIT, ET NON CE QUE LA RÈGLE INTERDIT. Le champ ne portait
            que son minimum : une borne, pas une conséquence. Ce qu'un client
            veut savoir en posant un versement mensuel, c'est ce qu'il aura mis
            de côté dans un an. */}
        {verse > 0 ? (
          <small className={styles.suite}>
            <b>{t("{n} FCFA sur douze mois", { n: fmt(verse * 12) })}</b>
            {parts > 0 && <span> · {t("environ {n} parts par versement, à la valeur du jour", { n: parts.toLocaleString("fr-FR", { maximumFractionDigits: 2 }) })}</span>}
          </small>
        ) : (
          plancher > 0 && <small className="muted">{t("minimum {n}", { n: fmt(plancher) })}</small>
        )}
      </label>
      {/* VINGT-HUIT CASES, ET LE POUCE CHOISIT.
          C'était un « input type=number » : sur un téléphone, le clavier
          numérique, ou deux flèches de huit pixels. Une liste déroulante
          demanderait un geste pour l'ouvrir, un pour défiler, un pour choisir —
          trois pour une décision qui en vaut un.
          LES JOURS S'ARRÊTENT À 28 parce que le 31 n'existe pas sept mois sur
          douze et le 29 deux années sur trois. La borne était déjà dans le
          champ ; elle n'était écrite nulle part où l'œil la rencontre. */}
      <fieldset className={`field ${styles.jours}`}>
        <legend>{t("Chaque mois, le")}</legend>
        <input type="hidden" name="dayOfMonth" value={jour} />
        <div className={styles.grille}>
          {Array.from({ length: 28 }, (_, i) => i + 1).map((j) => (
            <button key={j} type="button" aria-pressed={jour === j} className={jour === j ? styles.jourOn : styles.jour} onClick={() => setJour(j)}>
              {j}
            </button>
          ))}
        </div>
        {aujourdhui ? (
          <small className={styles.suite}>
            <b>{t("Premier versement le {d}", { d: fmtDate(premierVersement(jour, aujourdhui)) })}</b>
            <span> · {t("puis le {j} de chaque mois", { j: String(jour) })}</span>
          </small>
        ) : (
          <small className="muted">{t("du 1 au 28 : tous les mois ont ces jours-là")}</small>
        )}
      </fieldset>
      <div className={styles.row}>
        <label className="field">
          {t("Jusqu'au (facultatif)")}
          <input name="endsOn" type="date" value={jusquau} onChange={(e) => setJusquau(e.target.value)} />
          <small className="muted">{t("sans date, le versement court jusqu'à ce que vous l'arrêtiez")}</small>
        </label>
        <label className="field">
          {t("Si un mois l'exécution est impossible")}
          {/* La liste de la maison, pas celle du téléphone. */}
          <Select
            block
            name="onBlocked"
            value={bloque}
            onChange={setBloque}
            options={[
              { value: "passer", label: t("passer ce versement et continuer") },
              { value: "arreter", label: t("arrêter le versement programmé") },
            ]}
          />
        </label>
      </div>
      {/* COMMENT L'ARGENT ARRIVERA. On programmait un versement mensuel sans
          jamais poser la question : le client découvrait au premier mois qu'il
          devait virer lui-même. La convention interdit d'imposer un
          prélèvement, donc les deux chemins restent, mais il en choisit un. */}
      <fieldset className={styles.reglement}>
        <legend>{t("Comment l'argent arrivera")}</legend>
        <label>
          <input type="radio" name="reglement" value="virement" checked={reglement === "virement"} onChange={() => setReglement("virement")} />
          <span>
            <b>{t("Je vire moi-même, chaque mois")}</b>
            <small>{t("Vous recevez un appel de fonds avec les coordonnées et la référence à citer.")}</small>
          </span>
        </label>
        <label>
          <input type="radio" name="reglement" value="prelevement" checked={reglement === "prelevement"} onChange={() => setReglement("prelevement")} />
          <span>
            <b>{t("Prélevez-moi sur mon compte bancaire")}</b>
            <small>{t("Un mandat à signer une fois, par code. Chaque prélèvement vous est annoncé cinq jours avant.")}</small>
          </span>
        </label>
      </fieldset>
      </div>
      {/* LE RÉCAPITULATIF NE DEMANDE RIEN : il redit les six décisions côte à
          côte, au moment où l'on signe. Les champs restent dans la page,
          cachés, pour que le formulaire parte entier. */}
      <div data-step="2">
        <div className={styles.recap}>
          {fonds && (
            <div>
              <span>{t("Vers quel fonds")}</span>
              <b>{fonds.find((f) => f.id === choisi)?.title ?? "—"}</b>
            </div>
          )}
          <div>
            <span>{t("Chaque mois")}</span>
            <b>
              {fmt(verse)} {unit}
              <small>{t("{n} FCFA sur douze mois", { n: fmt(verse * 12) })}</small>
            </b>
          </div>
          <div>
            <span>{t("Le")}</span>
            <b>
              {t("{j} de chaque mois", { j: String(jour) })}
              {aujourdhui && <small>{t("Premier versement le {d}", { d: fmtDate(premierVersement(jour, aujourdhui)) })}</small>}
            </b>
          </div>
          <div>
            <span>{t("Jusqu'au")}</span>
            <b>{jusquau ? fmtDate(jusquau) : t("sans date : jusqu'à ce que vous l'arrêtiez")}</b>
          </div>
          <div>
            <span>{t("Si un mois l'exécution est impossible")}</span>
            <b>{t(bloque === "arreter" ? "arrêter le versement programmé" : "passer ce versement et continuer")}</b>
          </div>
          <div>
            <span>{t("Comment l'argent arrivera")}</span>
            <b>{t(reglement === "prelevement" ? "Prélevez-moi sur mon compte bancaire" : "Je vire moi-même, chaque mois")}</b>
          </div>
        </div>
      </div>
      <div className={styles.pied}>
        {etape === 2 && (
          <button className="btn ghost" type="button" onClick={() => setEtape(1)}>
            {t("Corriger")}
          </button>
        )}
        {etape === 1 ? (
          /* LE PASSAGE NE SE FAIT PAS SUR UN FORMULAIRE INCOMPLET : sans
             montant, le récapitulatif dirait « 0 FCFA sur douze mois », et un
             récapitulatif qui ment est pire que pas de récapitulatif. */
          <button className="btn" type="button" disabled={!(verse > 0) || verse < plancher} onClick={() => setEtape(2)}>
            {t("Continuer")}
          </button>
        ) : (
          <button className="btn primary" type="submit" disabled={pending}>
            {t(pending ? "…" : "Programmer ce versement")}
          </button>
        )}
      </div>
      <Msg state={state} />
    </form>
  );
}

export interface StandingRow {
  id: string;
  ref: string;
  title: string;
  href: string;
  amount: number;
  dayOfMonth: number;
  /** D'où vient l'argent : un virement mensuel, ou les encaissements du client. */
  source?: "virement" | "encaissements";
  /** Le plancher d'un réinvestissement, en deçà duquel on attend le coupon suivant. */
  minAmount?: number;
  state: string;
  stateLabel: string;
  next: string | null;
  lastRunOn?: string;
  endsOn?: string;
  stopReason?: string;
  offerId: string;
  /** La clé du client, quand il en a écrit une : destination et part, dans l'ordre. */
  splits?: { offerId: string; title: string; pct: number }[];
}

/** Ce qui est programmé, et le bouton pour l'arrêter. */
/**
 * LES INSTRUCTIONS ARRÊTÉES SE MASQUENT, ELLES NE SE SUPPRIMENT PAS.
 *
 * Elles portent la trace d'ordres réellement exécutés : un client qui voudrait
 * « faire le ménage » couperait le lien entre son argent et la raison pour
 * laquelle il est parti. Les masquer répond au besoin, qui est de ne pas lire
 * cinq lignes mortes au-dessus de celle qui court, sans couper la piste.
 *
 * Le compte reste visible, parce qu'un repli qui ne dit pas ce qu'il cache fait
 * douter qu'il cache quelque chose.
 */
export function StandingList({ rows, fonds = [] }: { rows: StandingRow[]; fonds?: FondsChoix[] }) {
  const { fmtDate } = useDates();
  const t = useT();
  const [state, action, pending] = useActionState<StandingResult | null, FormData>(stopStandingAction, null);
  const [tout, setTout] = useState(false);
  const [modif, setModif] = useState<string | null>(null);
  /* Le versement dont on vient de demander l'arrêt, et qui attend un oui. */
  const [aArreter, setAArreter] = useState<string | null>(null);
  if (!rows.length) return null;
  const vivantes = rows.filter((x) => x.state === "active");
  const closes = rows.filter((x) => x.state !== "active");
  const montrees = tout ? [...vivantes, ...closes] : vivantes;
  return (
    <div className={styles.list}>
      {montrees.map((s) => (
        <div key={s.id} className={styles.item}>
          <div className={styles.what}>
            {/* Un réinvestissement n'a ni montant ni jour du mois : afficher
                « 0 FCFA le 1 de chaque mois » décrirait une instruction que
                personne n'a donnée. Il dit donc ce qu'il fait vraiment. */}
            <b>
              {s.source === "encaissements"
                ? t("Vos encaissements, replacés dès qu'ils arrivent")
                : `${fmt(s.amount)} FCFA · ${t("le {d} de chaque mois", { d: String(s.dayOfMonth) })}`}
            </b>
            <Link href={s.href}>{s.title}</Link>
            <small className="muted">
              <span className="mono">{s.ref}</span>
              {s.source === "encaissements"
                ? s.minAmount
                  ? ` · ${t("à partir de {m} FCFA encaissés", { m: fmt(s.minAmount) })}`
                  : ` · ${t("quel que soit le montant")}`
                : s.next
                  ? ` · ${t("prochain versement le {d}", { d: fmtDate(s.next) })}`
                  : ""}
              {s.endsOn ? ` · ${t("jusqu'au {d}", { d: fmtDate(s.endsOn) })}` : ""}
              {s.lastRunOn ? ` · ${t("dernier versement le {d}", { d: fmtDate(s.lastRunOn) })}` : ""}
              {s.stopReason ? ` · ${s.stopReason}` : ""}
            </small>
            {/* La clé se lit en entier : « 60 % ici, 40 % là » est l'ordre du
                client, et le résumer à la première destination le trahirait. */}
            {s.splits && s.splits.length > 1 && <small className={styles.cleDite}>{s.splits.map((x) => `${x.pct} % ${x.title}`).join(" · ")}</small>}
          </div>
          {s.state === "active" ? (
            <div className={styles.actes}>
              {fonds.length > 0 && (
                <button className="btn sm ghost" type="button" onClick={() => setModif(modif === s.id ? null : s.id)}>
                  {t("Modifier")}
                </button>
              )}
              {/* ARRÊTER SE CONFIRME. Le bouton partait au premier clic, à
                  côté de « Modifier » et de la même taille : un doigt qui
                  glisse arrêtait un versement mensuel, et rien ne le
                  rattrapait — l'instruction arrêtée ne se reprend pas, elle
                  se repose. La confirmation tient sur place, sans fenêtre :
                  ce qu'on arrête reste sous les yeux pendant qu'on décide. */}
              {aArreter === s.id ? (
                <form action={action} className={styles.confirme}>
                  <input type="hidden" name="id" value={s.id} />
                  <span>{t("Arrêter ce versement ?")}</span>
                  <button className="btn sm" type="submit" disabled={pending}>
                    {t("Oui, arrêter")}
                  </button>
                  <button className="btn sm ghost" type="button" onClick={() => setAArreter(null)}>
                    {t("Annuler")}
                  </button>
                </form>
              ) : (
                <button className="btn sm ghost" type="button" onClick={() => setAArreter(s.id)}>
                  {t("Arrêter")}
                </button>
              )}
            </div>
          ) : (
            <span className="muted">{t(s.stateLabel)}</span>
          )}
          {modif === s.id && (
            <ModifierInstruction
              s={{ id: s.id, ref: s.ref, amount: s.amount, dayOfMonth: s.dayOfMonth, minAmount: s.minAmount ?? 0, source: s.source, offerId: s.offerId, splits: s.splits?.map((x) => ({ offerId: x.offerId, pct: x.pct })) }}
              fonds={fonds}
              onClose={() => setModif(null)}
            />
          )}
        </div>
      ))}
      {closes.length > 0 && (
        <button type="button" className={styles.repli} onClick={() => setTout((x) => !x)}>
          {tout ? t("Masquer les instructions arrêtées") : t("Voir les {n} instructions arrêtées", { n: String(closes.length) })}
        </button>
      )}
      <Msg state={state} />
    </div>
  );
}
