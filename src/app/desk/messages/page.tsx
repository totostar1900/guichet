import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { FromSante } from "@/components/desk/FromSante";
import { Toolbar } from "@/components/ui/Toolbar";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import type { PieceGardee } from "@/lib/domain/types";
import type { InboundMessage, Notification } from "@/lib/domain/types";
import { fmtDateTime } from "@/lib/format";
import { textMatch } from "@/lib/text";
import { displayStatus, isPast } from "@/lib/domain/status";
import { cheminDeLaCle } from "@/lib/domain/echange";
import { classerAction, epinglerAction, etiquetterAction, reporterAction, rouvrirAction, traiterAction } from "./actions";
import { cleDeSecours, echangeDUneReponse, titreDEchange } from "./grouper";
import { ETIQUETTES, motEtiquette } from "./etiquettes";
import { estReporte, REPORTS } from "./report";
import { modelesDuFil } from "./modeles";
import { Colonnes } from "./Colonnes";
import { GardeTaille } from "./GardeTaille";
import { PoigneeRail } from "./PoigneeRail";
import { Replier } from "./Replier";
import { ReplyForm } from "./ReplyForm";
import { TransfertForm } from "./TransfertForm";
import styles from "./page.module.css";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages" };

type Msg = { at: string; dir: "in" | "out"; channel: string; text: string; status?: string; subject?: string; handled?: boolean; intentId?: string; id?: string; pieces?: PieceGardee[] };

/** Une affaire : ce qui se traite, se reporte, s'étiquette et se clôt. */
type Echange = { cle: string; titre: string; parLeSilence: boolean; msgs: Msg[]; unread: number; last: string; ouvert: string; handledAt?: string; snoozedUntil?: string; labels: string[] };

/** Une personne ou une institution, et ses affaires. */
type Correspondant = { key: string; channel: "whatsapp" | "email"; name?: string; clientId?: string; pinnedAt?: string; echanges: Echange[]; unread: number; last: string };

/**
 * La boîte aux lettres du desk, à deux étages : le correspondant, puis
 * l'échange.
 *
 * POURQUOI DEUX ÉTAGES. Elle groupait par ADRESSE, et la BEAC envoie un avis par
 * séance : dix-sept affaires distinctes dans un fil unique où rien ne pouvait
 * être dit réglé. L'étiquette, posée là, portait sur une personne alors que
 * « réclamation » décrit une affaire.
 *
 * CE QUI PORTE QUOI. L'épingle reste sur le correspondant : « ce dossier passe
 * devant aujourd'hui » est vrai de quelqu'un. Traité, reporté et étiqueté
 * portent sur l'échange. Chaque message reçu garde en plus son propre
 * « traité », qui dit qu'une pièce de courrier a reçu sa réponse.
 *
 * DEUX LECTURES DU RAIL, au choix, dans l'adresse :
 *   « plat » (défaut) : l'échange est la ligne, le correspondant est une bande
 *   au-dessus de ses affaires. Le desk ouvre sa boîte pour traiter ce qui vient
 *   d'arriver, et l'arrivée est donc visible sans rien déplier. La bande ne
 *   paraît qu'au pluriel : un correspondant qui n'a qu'une affaire tient sur une
 *   ligne, parce que c'est le cas courant et qu'il doit rester le plus léger.
 *   « accordéon » : chaque étage se replie, et chaque étage a son « tout
 *   replier ». Elle garde la liste courte quand cinquante correspondants
 *   écrivent le même matin.
 */
export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ avec?: string; q?: string; etat?: string; canal?: string; etiquette?: string; vue?: string; depuis?: string; point?: string }>;
}) {
  const t = await getT();
  const sp = await searchParams;
  /* Qui signe. La disposition garde déjà le desk ; on relit la session pour le
     nom, que le serveur met au bas de chaque message. */
  const desk = await requireDesk();
  const r = repo();
  const [inbound, notifications, contacts, intents, offers, fils, etats] = await Promise.all([
    r.listInbound(1000),
    r.listNotifications(1000),
    r.listContacts(),
    r.listIntents(),
    r.listOffers(),
    r.listDeskThreads(),
    r.listDeskExchanges(),
  ]);
  const now = new Date();
  const maintenant = now.getTime();
  const accordeon = sp.vue === "accordeon";
  const lines = offers.filter((o) => !isPast(displayStatus(o, now))).map((o) => ({ id: o.id, title: o.title }));

  const gens = new Map<string, Correspondant>();
  const qui = (key: string, channel: "whatsapp" | "email") => {
    let g = gens.get(key);
    if (!g) {
      const c = contacts.find((x) => (channel === "whatsapp" ? x.phone === key : x.email === key));
      const i = intents.find((x) => (channel === "whatsapp" ? x.contactPhone === key : x.contactEmail === key));
      g = { key, channel, name: c?.name ?? i?.clientName, clientId: c?.id ?? i?.clientId, echanges: [], unread: 0, last: "" };
      gens.set(key, g);
    }
    return g;
  };
  const echange = (g: Correspondant, cle: string, objet: string | undefined, quand: string) => {
    let e = g.echanges.find((x) => x.cle === cle);
    if (!e) {
      e = { cle, titre: "", parLeSilence: cheminDeLaCle(cle) === "silence", msgs: [], unread: 0, last: "", ouvert: quand, labels: [] };
      g.echanges.push(e);
    }
    /* Le titre vient du premier objet rencontré, et la date d'ouverture du plus
       ancien message : les deux se tiennent, un échange est nommé par ce qui
       l'a ouvert. */
    if (!e.titre && objet?.trim()) e.titre = objet.trim();
    if (quand < e.ouvert) e.ouvert = quand;
    return e;
  };

  /* Les messages reçus d'abord : ce sont eux qui portent la clef d'échange,
     posée à leur arrivée. */
  const recusParGens = new Map<string, { at: string; convKey?: string }[]>();
  for (const m of inbound as InboundMessage[]) {
    if (m.channel === "push") continue;
    const g = qui(m.from, m.channel);
    if (!g.name && m.name) g.name = m.name;
    const cle = m.convKey ?? cleDeSecours(m.channel, m.from);
    const e = echange(g, cle, m.subject, m.receivedAt);
    e.msgs.push({ at: m.receivedAt, dir: "in", channel: m.channel, text: m.body, subject: m.subject, handled: Boolean(m.handledAt), id: m.id, pieces: m.attachments ?? [] });
    if (!m.handledAt) e.unread++;
    const liste = recusParGens.get(m.from) ?? [];
    liste.push({ at: m.receivedAt, convKey: cle });
    recusParGens.set(m.from, liste);
  }

  /* Les réponses ensuite : celles d'avant la migration 0058 n'ont pas de clef et
     rejoignent l'échange qui était ouvert quand elles sont parties. La règle est
     dans grouper.ts, sous cliquet, parce qu'elle devine. */
  for (const n of notifications as Notification[]) {
    if (n.channel === "push") continue;
    const g = qui(n.to, n.channel);
    if (!g.name && n.contactName) g.name = n.contactName;
    const cle = n.convKey ?? echangeDUneReponse(n.createdAt, recusParGens.get(n.to) ?? [], cleDeSecours(n.channel, n.to));
    const e = echange(g, cle, n.subject, n.createdAt);
    e.msgs.push({ at: n.createdAt, dir: "out", channel: n.channel, text: n.body, status: n.status, subject: n.subject, intentId: n.intentId });
  }

  const etatsParCle = new Map(etats.map((e) => [e.convKey, e]));
  for (const g of gens.values()) {
    const f = fils.find((x) => x.channel === g.channel && x.addr === g.key);
    g.pinnedAt = f?.pinnedAt;
    for (const e of g.echanges) {
      /* LE PLUS RÉCENT EN HAUT, décidé le 2026-10-01 par l'utilisateur.
         Ce desk ouvre un échange pour TRAITER ce qui vient d'arriver, pas pour
         relire une conversation : la chose à lire est la dernière, elle se met
         donc là où l'œil tombe. Le prix assumé : une réponse se trouve au-dessus
         du message auquel elle répond. */
      e.msgs.sort((a, b) => b.at.localeCompare(a.at));
      e.last = e.msgs[0]?.at ?? e.ouvert;
      e.titre = titreDEchange(e.titre, e.ouvert, (iso) => fmtDateTime(iso).split(" ")[0]);
      const etat = etatsParCle.get(e.cle);
      e.handledAt = etat?.handledAt;
      e.snoozedUntil = etat?.snoozedUntil;
      e.labels = etat?.labels ?? [];
    }
    g.echanges.sort((a, b) => b.last.localeCompare(a.last));
    g.unread = g.echanges.reduce((s, e) => s + e.unread, 0);
    g.last = g.echanges[0]?.last ?? "";
  }

  /* UN ÉCHANGE REPORTÉ SORT DE LA FILE jusqu'à son heure, et y rentre tout seul.
     Le chapeau « Reportés » le montre entre-temps, sinon un report se ferait à
     l'aveugle et personne ne saurait ce qu'il a mis de côté. */
  const garde = (e: Echange, g: Correspondant) =>
    (!sp.canal || g.channel === sp.canal) &&
    (sp.etiquette ? e.labels.includes(sp.etiquette) : true) &&
    (sp.etat === "reportees" ? estReporte(e.snoozedUntil, maintenant) : !estReporte(e.snoozedUntil, maintenant)) &&
    (sp.etat !== "a_traiter" || e.unread > 0) &&
    (sp.etat !== "traites" || e.unread === 0) &&
    (sp.etat !== "epinglees" || Boolean(g.pinnedAt)) &&
    textMatch(sp.q, g.key, g.name, e.titre, ...e.msgs.slice(0, 3).map((m) => m.text));

  /* L'ÉPINGLÉ PASSE DEVANT, avant même le non-lu : c'est le dossier du jour, et
     il doit rester sous la main quand vingt messages arrivent par-dessus. Un
     correspondant suit son échange le plus récent, donc il remonte quand il
     écrit, sans emporter ses vieilles affaires avec lui. */
  const liste = [...gens.values()]
    .map((g) => ({ g, echanges: g.echanges.filter((e) => garde(e, g)) }))
    .filter((x) => x.echanges.length > 0)
    .sort((a, b) => Number(Boolean(b.g.pinnedAt)) - Number(Boolean(a.g.pinnedAt)) || b.g.unread - a.g.unread || (b.echanges[0]?.last ?? "").localeCompare(a.echanges[0]?.last ?? ""));

  const tousEchanges = [...gens.values()].flatMap((g) => g.echanges.map((e) => ({ e, g })));
  /* L'adresse désigne un ÉCHANGE. Un lien d'avant la bascule porte encore une
     adresse de correspondant : on ouvre alors son échange le plus récent plutôt
     que de montrer une page vide. */
  const ouvert =
    (sp.avec ? tousEchanges.find((x) => x.e.cle === sp.avec) : undefined) ??
    (sp.avec ? tousEchanges.filter((x) => x.g.key === sp.avec).sort((a, b) => b.e.last.localeCompare(a.e.last))[0] : undefined) ??
    (liste[0] ? { e: liste[0].echanges[0], g: liste[0].g } : undefined);

  /* Le compteur de la navigation compte les ÉCHANGES à traiter, pas les
     messages : c'est le nombre d'affaires en attente qui dit la charge du desk.
     Les reportés en sont exclus, ils ne sont pas en attente, ils ont un
     rendez-vous. */
  const enAttente = tousEchanges.filter((x) => x.e.unread > 0 && !estReporte(x.e.snoozedUntil, maintenant)).length;

  /* Le dernier message VENU du client : il ouvre la fenêtre de 24 h de WhatsApp
     et c'est lui que « Citer » reprend. Les messages sont triés du plus récent
     au plus ancien, donc c'est le PREMIER « in » qu'on cherche. */
  const recu = ouvert?.e.msgs.find((m) => m.dir === "in");
  const dernierRecu = recu ? { at: recu.at, text: recu.text } : undefined;
  const sien = ouvert
    ? intents
        .filter((i) => (ouvert.g.channel === "whatsapp" ? i.contactPhone === ouvert.g.key : i.contactEmail === ouvert.g.key))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
    : undefined;
  const modeles = ouvert
    ? await modelesDuFil(sien?.state, {
        client: ouvert.g.name ?? "",
        ref: sien?.ref ?? "",
        ligne: sien ? (offers.find((o) => o.id === sien.offerId)?.title ?? "") : "",
      })
    : [];

  const lien = (cle: string) => `/desk/messages?avec=${encodeURIComponent(cle)}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}${accordeon ? "&vue=accordeon" : ""}`;
  const autreVue = `/desk/messages?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(sp.etat ? { etat: sp.etat } : {}), ...(accordeon ? {} : { vue: "accordeon" }) }).toString()}`;

  /** Une affaire, telle qu'elle paraît dans le rail. Les deux vues la partagent. */
  const Ligne = ({ e, g, avecNom }: { e: Echange; g: Correspondant; avecNom?: boolean }) => (
    <div className={styles.item} data-ouvert={ouvert?.e.cle === e.cle ? "" : undefined}>
      <Link href={lien(e.cle)} className={styles.itemLien} aria-current={ouvert?.e.cle === e.cle ? "true" : undefined}>
        <div className={styles.itemTop}>
          <b>{avecNom ? (g.name ?? g.key) : e.titre}</b>
        </div>
        {avecNom && <div className={styles.itemObjet}>{e.titre}</div>}
        {/* LA BANDE DE COLONNES. Le serveur les rend TOUTES, dans cet ordre, et
            la feuille que pose Colonnes.tsx les range : « order » pour la place,
            « flex-basis » pour la largeur, « display: none » pour celles qu'on ne
            veut pas. Sans JavaScript, tout paraît dans l'ordre du document, ce
            qui est le bon défaut.
            « data-col » plutôt qu'une classe : les modules CSS brouillent les
            noms de classes, et la feuille se construit côté navigateur. */}
        <div className={styles.itemBottom}>
          <span data-col="etiquettes" className={styles.colEtiquettes}>
            {e.labels.map((l) => (
              <span key={l} className={styles.marque}>
                {t(motEtiquette(l))}
              </span>
            ))}
          </span>
          <span data-col="apercu" className={styles.preview}>
            {e.msgs[0]?.dir === "out" ? "Vous : " : ""}
            {e.msgs[0]?.text.replace(/\s+/g, " ").slice(0, 60)}
          </span>
          <span data-col="canal" className={styles.chan}>
            {g.channel === "whatsapp" ? "WhatsApp" : "E-mail"}
          </span>
          <small data-col="date" className={styles.colDate}>
            {fmtDateTime(e.last).split(" ")[0]}
          </small>
          <span data-col="nonlus" className={styles.colNonlus}>
            {e.unread > 0 && <em className={styles.unread}>{e.unread}</em>}
          </span>
        </div>
        {/* UNE COUPURE DEVINÉE SE DIT DEVINÉE. WhatsApp n'a pas d'objet : les
            échanges s'y séparent au silence, et c'est une estimation. */}
        {e.parLeSilence && e.msgs.length > 0 && <div className={styles.devine}>{t("séparé au silence, faute d'objet")}</div>}
      </Link>
      <div data-col="gestes" className={styles.gestes}>
        <button type="submit" form="g-reporter" name="cle" value={e.cle} className={styles.geste} title={estReporte(e.snoozedUntil, maintenant) ? t("Revient le {d}", { d: fmtDateTime(e.snoozedUntil ?? "") }) : t("Reporter à demain 9 h")}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </button>
        {e.unread > 0 && (
          <button type="submit" form="g-traiter" name="cle" value={e.cle} className={styles.geste} title={t("Marquer comme traité")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="m4 12 5 5L20 6" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );

  /** L'épingle : elle porte sur la personne, donc elle vit sur la bande. */
  const Epingle = ({ g }: { g: Correspondant }) => (
    <button type="submit" form="g-epingler" name="cible" value={`${g.channel}|${g.key}`} className={styles.geste} aria-pressed={Boolean(g.pinnedAt)} title={g.pinnedAt ? t("Retirer l'épingle") : t("Épingler")}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill={g.pinnedAt ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M14 2 9 7H6a2 2 0 0 0-2 2v2h5v11l2-3 2 3V11h5V9a2 2 0 0 0-2-2h-3Z" />
      </svg>
    </button>
  );

  return (
    <>
      <DeskNav current="/desk/messages" badges={{ "/desk/messages": enAttente }} />
      {sp.depuis === "sante" && <FromSante point={sp.point ?? ""} />}
      <Toolbar
        placeholder={t("Nom, numéro, adresse, objet, texte…")}
        chipKey="etat"
        chips={[
          { value: "", label: t("Tous"), count: tousEchanges.length },
          { value: "a_traiter", label: t("À traiter"), count: tousEchanges.filter((x) => x.e.unread > 0).length },
          { value: "traites", label: t("Traités") },
          { value: "epinglees", label: t("Épinglés"), count: tousEchanges.filter((x) => x.g.pinnedAt).length },
          { value: "reportees", label: t("Reportés"), count: tousEchanges.filter((x) => estReporte(x.e.snoozedUntil, maintenant)).length },
        ]}
        selects={[
          { key: "canal", label: t("Canal"), all: "tous", options: [{ value: "whatsapp", label: t("WhatsApp") }, { value: "email", label: t("E-mail") }] },
          { key: "etiquette", label: t("Étiquette"), all: "toutes", options: ETIQUETTES.map((e) => ({ value: e.cle, label: t(e.mot) })) },
        ]}
      />

      <div className={styles.layout} data-coach="inbox">
        {/* Les deux panneaux se redimensionnent par la poignée du navigateur, et
            gardent la taille qu'on leur donne : une liste à 320 px convient à un
            écran et à un seul. */}
        <GardeTaille />
        <aside id="desk-messages-liste" className={styles.list}>
          {/* LES FORMULAIRES DES GESTES, posés une seule fois.
              Chaque bouton de ligne s'y rattache par « form », et porte sa cible
              en valeur. Un bouton dans un lien serait du HTML invalide, et un
              formulaire par ligne en ferait autant que d'affaires. */}
          <form id="g-epingler" action={epinglerAction} />
          <form id="g-reporter" action={reporterAction} />
          <form id="g-traiter" action={traiterAction} />

          <div className={styles.lot}>
            <Link className="btn sm ghost" href={autreVue}>
              {accordeon ? t("Vue à plat") : t("Vue en accordéon")}
            </Link>
            <Colonnes />
          </div>
          {accordeon && (
            <div className={styles.replis}>
              <Replier niveau="correspondant" libelle={{ tout: t("Correspondants"), replier: t("Replier"), deplier: t("Déplier") }} />
              <Replier niveau="echange" libelle={{ tout: t("Échanges"), replier: t("Replier"), deplier: t("Déplier") }} />
            </div>
          )}

          {liste.map(({ g, echanges }) =>
            accordeon ? (
              <details key={g.key} data-niveau="correspondant" open className={styles.pli}>
                <summary className={styles.pliTete}>
                  <b>{g.name ?? g.key}</b>
                  <span className={styles.pliCompte}>{t("{n} échange(s)", { n: String(echanges.length) })}</span>
                  {g.unread > 0 && <em className={styles.unread}>{g.unread}</em>}
                </summary>
                <div className={styles.pliCorps}>
                  <div className={styles.pliGestes}>
                    <Epingle g={g} />
                  </div>
                  {echanges.map((e) => (
                    <details key={e.cle} data-niveau="echange" open={ouvert?.e.cle === e.cle} className={styles.pli}>
                      <summary className={styles.pliTete}>
                        <b>{e.titre}</b>
                        <small>{fmtDateTime(e.last).split(" ")[0]}</small>
                        {e.unread > 0 && <em className={styles.unread}>{e.unread}</em>}
                      </summary>
                      <div className={styles.pliCorps}>
                        <Ligne e={e} g={g} />
                        <ol className={styles.apercu}>
                          {e.msgs.slice(0, 6).map((m, i) => (
                            <li key={i}>
                              <small>{fmtDateTime(m.at).split(" ")[0]}</small> {m.dir === "out" ? t("Vous :") : ""} {m.text.replace(/\s+/g, " ").slice(0, 54)}
                            </li>
                          ))}
                        </ol>
                      </div>
                    </details>
                  ))}
                </div>
              </details>
            ) : echanges.length === 1 ? (
              /* UN SEUL ÉCHANGE : pas de bande. C'est le cas courant, et une
                 bande au-dessus d'une ligne unique doublerait la hauteur de la
                 liste pour ne rien dire. */
              <div key={g.key} className={styles.bloc}>
                <Ligne e={echanges[0]} g={g} avecNom />
                <div className={styles.blocEpingle}>
                  <Epingle g={g} />
                </div>
              </div>
            ) : (
              <div key={g.key} className={styles.bloc}>
                <div className={styles.bande} data-epingle={g.pinnedAt ? "" : undefined}>
                  <b>{g.name ?? g.key}</b>
                  <span className={styles.bandeCompte}>{t("{n} échange(s)", { n: String(echanges.length) })}</span>
                  <Epingle g={g} />
                </div>
                {echanges.map((e) => (
                  <Ligne key={e.cle} e={e} g={g} />
                ))}
              </div>
            ),
          )}
          {liste.length === 0 && <div className="empty">{t("Aucun échange. Les messages WhatsApp arrivent par le webhook Meta, les e-mails par la boîte d'entrée configurée.")}</div>}
        </aside>

        {/* LA SÉPARATION SE TIRE. Le coin de redimensionnement du navigateur
            donne la hauteur ; le geste attendu pour la largeur est de tirer la
            barre entre la liste et le fil, là où l'oeil la voit. Elle se prend
            aussi au clavier, ce que le coin ne permet pas. */}
        <PoigneeRail />

        {ouvert ? (
          <div id="desk-messages-fil" className={styles.thread}>
            <div className={styles.threadHead}>
              <div>
                <b>{ouvert.e.titre}</b>
                <small className="muted">
                  {ouvert.g.name ?? ouvert.g.key} · {ouvert.g.key} · {ouvert.g.channel === "whatsapp" ? "WhatsApp" : "E-mail"}
                  {estReporte(ouvert.e.snoozedUntil, maintenant) ? ` · ${t("revient le {d}", { d: fmtDateTime(ouvert.e.snoozedUntil ?? "") })}` : ""}
                </small>
                {/* L'ÉTIQUETTE SE POSE ICI et non dans la liste : savoir de quoi
                    parle un courrier demande de l'avoir lu. Le même bouton la
                    pose et la retire. Elle porte sur l'ÉCHANGE depuis le
                    2 octobre 2026 : posée sur l'adresse, elle couvrait tout ce
                    que ce correspondant a jamais écrit. */}
                <div className={styles.marques}>
                  {ETIQUETTES.map((et) => {
                    const posee = ouvert.e.labels.includes(et.cle);
                    return (
                      <form key={et.cle} action={etiquetterAction}>
                        <input type="hidden" name="cle" value={ouvert.e.cle} />
                        <input type="hidden" name="etiquette" value={et.cle} />
                        <button type="submit" className={styles.marqueBtn} aria-pressed={posee} style={posee ? { background: et.fond, color: et.teinte, borderColor: et.teinte } : undefined}>
                          {t(et.mot)}
                        </button>
                      </form>
                    );
                  })}
                  {REPORTS.map((rp) => (
                    <form key={rp.cle} action={reporterAction}>
                      <input type="hidden" name="cle" value={ouvert.e.cle} />
                      <input type="hidden" name="quand" value={rp.cle} />
                      <button type="submit" className={styles.marqueBtn}>
                        {t("Reporter {q}", { q: rp.mot })}
                      </button>
                    </form>
                  ))}
                  {estReporte(ouvert.e.snoozedUntil, maintenant) && (
                    <form action={reporterAction}>
                      <input type="hidden" name="cle" value={ouvert.e.cle} />
                      <input type="hidden" name="quand" value="rendre" />
                      <button type="submit" className={styles.marqueBtn}>
                        {t("Rendre maintenant")}
                      </button>
                    </form>
                  )}
                </div>
              </div>
              <div className={styles.threadBtns}>
                {ouvert.g.clientId && (
                  <Link className="btn sm ghost" href={`/desk/clients`}>
                    {t("Dossier")}
                  </Link>
                )}
                {ouvert.e.unread > 0 || !ouvert.e.handledAt ? (
                  <form action={traiterAction}>
                    <input type="hidden" name="cle" value={ouvert.e.cle} />
                    <button className="btn sm" type="submit">
                      {t("Clore l'échange")}
                    </button>
                  </form>
                ) : (
                  /* L'INVERSE, QUI MANQUAIT. Clore était une porte à sens
                     unique : un clic de trop sortait une affaire de la file sans
                     retour, et rien ne le disait. */
                  <form action={rouvrirAction}>
                    <input type="hidden" name="cle" value={ouvert.e.cle} />
                    <button className="btn sm ghost" type="submit">
                      {t("Rouvrir l'échange")}
                    </button>
                  </form>
                )}
              </div>
            </div>
            <ol className={styles.msgs}>
              {ouvert.e.msgs.map((m, i) => (
                <li key={i} className={m.dir === "in" ? styles.in : styles.out}>
                  <div className={styles.bubble}>
                    {m.subject && <b className={styles.subj}>{m.subject}</b>}
                    <span>{m.text}</span>
                  </div>
                  {/* LA PIÈCE VIT ICI, et plus dans « À valider ». Cette file sert
                      à ce qui peut devenir une ligne de marché ; un document
                      qu'un régulateur envoie n'a rien à y devenir, et le bouton
                      « Publier » n'a aucun sens à côté de lui. */}
                  {m.pieces?.map((piece, rang) => (
                    <div key={piece.fileKey} className={styles.piece}>
                      <span className={styles.pieceIcone} aria-hidden="true">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
                          <path d="M14 3v5h5" />
                        </svg>
                      </span>
                      <span className={styles.pieceQuoi}>
                        <b>{piece.name}</b>
                        <small>
                          {piece.mimeType === "application/pdf" ? "PDF" : piece.mimeType.startsWith("image/") ? t("image") : piece.mimeType} · {Math.max(1, Math.round(piece.size / 1024))} ko · {t("gardé au dépôt")}
                        </small>
                      </span>
                      {/* La pièce se désigne par son message et son rang, jamais
                          par sa clef : une adresse portant la clef laisserait
                          demander n'importe quel fichier du dépôt.

                          « Ouvrir » ne s'affiche que pour ce qui se regarde. Un
                          .docx ou un .zip ne s'ouvrent pas dans un navigateur :
                          proposer le geste donnerait une page cassée. */}
                      {(piece.mimeType === "application/pdf" || piece.mimeType.startsWith("image/")) && (
                        <a className="btn sm" href={`/desk/messages/piece/${m.id}/${rang}`} target="_blank" rel="noopener noreferrer">
                          {t("Ouvrir")}
                        </a>
                      )}
                      <a className="btn sm" href={`/desk/messages/piece/${m.id}/${rang}?t=1`} download={piece.name}>
                        {t("Télécharger")}
                      </a>
                      {/* CLASSER DANS LE DOSSIER. Depuis qu'aucun chemin ne mène
                          plus d'un message à « À valider », une pièce reçue
                          n'appartient qu'à son message ; or elle appartient au
                          dossier du client. Le fichier ne bouge pas : le dossier
                          référence la même clef de dépôt, et la pièce reste
                          visible dans son fil. */}
                      {ouvert.g.clientId && m.id && (
                        <form action={classerAction}>
                          <input type="hidden" name="messageId" value={m.id} />
                          <input type="hidden" name="rang" value={rang} />
                          <input type="hidden" name="userId" value={ouvert.g.clientId} />
                          <button className="btn sm ghost" type="submit">
                            {t("Classer dans le dossier")}
                          </button>
                        </form>
                      )}
                      {piece.intakeId && (
                        <Link className={styles.piecePartie} href={`/desk/a-valider?piece=${piece.intakeId}`}>
                          {t("déjà proposée en ligne de marché")}
                        </Link>
                      )}
                    </div>
                  ))}
                  {m.dir === "in" && m.id && <TransfertForm messageId={m.id} sujet={m.subject} pieces={m.pieces?.length ?? 0} />}
                  <small>
                    {fmtDateTime(m.at)}
                    {m.dir === "out" ? ` · ${m.status === "sent" ? "envoyé" : m.status === "skipped" ? "préparé, non envoyé" : m.status === "failed" ? "échec" : "en file"}` : m.handled ? " · traité" : ""}
                    {m.intentId && (
                      <>
                        {" · "}
                        <Link href={`/desk/intentions/${m.intentId}`}>{t("intention")}</Link>
                      </>
                    )}
                  </small>
                </li>
              ))}
            </ol>
            <ReplyForm
              to={ouvert.g.key}
              channel={ouvert.g.channel}
              name={ouvert.g.name}
              lines={lines}
              dernierRecu={dernierRecu}
              modeles={modeles}
              convKey={ouvert.e.cle}
              deskName={desk.name}
              appUrl={process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}
              from={process.env.EMAIL_FROM ?? ""}
            />
          </div>
        ) : (
          <div id="desk-messages-fil" className={styles.thread}>
            <div className="empty">{t("Choisissez un échange.")}</div>
          </div>
        )}
      </div>
    </>
  );
}
