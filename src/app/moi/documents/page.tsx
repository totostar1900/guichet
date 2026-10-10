import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { DOC_LABEL } from "@/lib/documents/registry";
import type { DocumentType } from "@/lib/domain/types";
import { INTENT_LABEL, INTENT_STATE_LABEL } from "@/lib/domain/intent";
import { fmt, fmtDate } from "@/lib/format";
import { positionsFrom } from "@/lib/positions";
import { LEGAL_VERSION } from "@/data/legal";
import type { Intent } from "@/lib/domain/types";
import { getT } from "@/i18n/server";
import { Pli } from "@/components/Pli";
import { Annee, Ligne } from "./Ligne";
import { Operations, type DocLigne } from "./Operations";
import { ToutReplier } from "./ToutReplier";
import { StatementButtons } from "../StatementButtons";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Mes documents") };
}

/* LE RAYON D'UN PAPIER SE LIT DE CE QU'IL FAIT, et un papier n'a qu'un rayon :
   ce que vous avez signé, ce qu'une opération a produit, un mouvement
   d'argent, une démarche. Un bulletin est un engagement avant d'être la pièce
   d'une opération : il monte donc au premier rayon, en nommant sa ligne. */
const SIGNES: DocumentType[] = ["convention", "mandat", "prelevement", "bulletin", "cession"];
const ARGENT: DocumentType[] = ["releve", "attestation"];
const DEMARCHES: DocumentType[] = ["reclamation", "transfert"];

/**
 * LES PAPIERS DU CLIENT, EN QUATRE RAYONS.
 *
 * LA PAGE ÉTAIT UN PANNEAU UNIQUE, et c'était le défaut : la convention, un
 * avis d'opéré et un relevé édité le matin même tombaient dans la même liste,
 * alors qu'on ne les cherche jamais pour les mêmes raisons. Une bascule « par
 * opération / par date » gouvernait tout, y compris les pièces qui n'ont
 * jamais appartenu à une opération.
 *
 * LE PRINCIPE, arrêté le 10 octobre 2026 : on cherche un document par CE
 * QU'IL PROUVE. Quatre rayons, chacun replié ou déplié à sa guise, et la
 * bascule descendue dans le seul rayon où elle a un sens.
 *
 * CHAQUE LIGNE PORTE AU PLUS UN GESTE, celui que le papier attend : signer,
 * régler, contester, modifier, suivre. Le reste vit dans la page de la pièce.
 * Et cette page ne compte pas les devoirs : l'accueil est seul à le faire.
 *
 * LES TEXTES DE LA MAISON N'Y SONT PAS. Ils n'ont pas de numéro, ils ont une
 * version, et ils sont les mêmes pour tous : ils vivent dans la feuille du
 * compte (/moi/textes). Un texte ACCEPTÉ, lui, devient votre document ce
 * jour-là : il revient ici, avec sa date et sa version.
 */
export default async function DocumentsPage() {
  const t = await getT();
  const s = await requireSession("/moi/documents");
  const r = repo();
  const [intents, offers, docs, myFile, consent] = await Promise.all([r.listIntents(), r.listOffers(), r.listDocuments(), r.getClientFileByUser(s.userId), r.getConsent(s.userId).catch(() => ({}) as { version?: string; at?: string })]);
  const [payouts, garde, tirages] = await Promise.all([
    r.listPayouts({ userId: s.userId }).catch(() => []),
    r.listCustodyNotices({ userId: s.userId }).catch(() => []),
    r.listTirages({ userId: s.userId }).catch(() => []),
  ]);
  const mine = intents.filter((i) => i.clientId === s.userId);
  const byOffer = new Map(offers.map((o) => [o.id, o]));
  /* Une ligne qui n'est plus au catalogue existe encore : ses documents gardent
     son nom. Sans ce rattrapage, un avis d'opéré se retrouverait sous un
     identifiant nu. */
  const manquantes = [...new Set(mine.map((i) => i.offerId).filter((id) => !byOffer.has(id)))];
  for (const o of await Promise.all(manquantes.map((id) => r.getOffer(id).catch(() => undefined)))) if (o) byOffer.set(o.id, o);
  const parIntention = new Map(mine.map((i) => [i.id, i]));

  const miens = docs.filter((d) => d.type !== "dossier_svt" && ((d.intentId && parIntention.has(d.intentId)) || (myFile && d.clientFileId === myFile.id) || d.clientId === s.userId));
  const tientQuelqueChose = positionsFrom(mine, offers).length > 0;
  const montant = (i: Intent, kind?: string) => (i.amount ? (i.type === "rachat" ? `${i.amount.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} parts` : `${fmt(i.amount)} ${kind === "RACHAT" ? "titres" : "FCFA"}`) : "");
  const ligneDe = (intentId?: string) => (intentId ? byOffer.get(parIntention.get(intentId)?.offerId ?? "")?.title : undefined);
  /* Le retour de la pièce revient d'où l'on vient : la visionneuse ramenait
     toujours à cette liste, même quand on arrivait d'un ordre. */
  const versLaPiece = (id: string) => `/moi/documents/${id}?de=${encodeURIComponent("/moi/documents")}`;

  /* ── Rayon 1 · ce que vous avez signé ─────────────────────────────── */
  const signes = miens
    .filter((d) => SIGNES.includes(d.type))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((d) => {
      const i = d.intentId ? parIntention.get(d.intentId) : undefined;
      const aSigner = Boolean(i) && !i!.signedAt && i!.state === "confirmee";
      return {
        id: d.id,
        titre: t(DOC_LABEL[d.type]),
        sous: [ligneDe(d.intentId), i?.amount ? montant(i, byOffer.get(i.offerId)?.kind) : undefined, d.number].filter(Boolean).join(" · "),
        etat: aSigner ? t("à signer") : d.status === "signe" ? t("signé par vous le {d}", { d: fmtDate(d.createdAt, false) }) : t("établi le {d}", { d: fmtDate(d.createdAt, false) }),
        ton: (aSigner ? "attend" : d.status === "signe" ? "fait" : undefined) as "attend" | "fait" | undefined,
        geste: aSigner
          ? { label: t("Signer"), href: `/moi/ordres/${d.intentId}`, primaire: true }
          : d.type === "prelevement"
            ? { label: t("Modifier"), href: "/moi/prelevements" }
            : { label: t("Ouvrir"), href: versLaPiece(d.id) },
      };
    });
  const aSigner = signes.filter((x) => x.ton === "attend").length;

  /* ── Rayon 2 · ce que vos opérations ont produit ───────────────────── */
  const desOperations: DocLigne[] = miens
    .filter((d) => !SIGNES.includes(d.type) && !ARGENT.includes(d.type) && !DEMARCHES.includes(d.type))
    .map((d) => {
      const i = d.intentId ? parIntention.get(d.intentId) : undefined;
      const aRegler = d.type === "fonds" && i?.state === "confirmee" && !i.coveredAt;
      return {
        id: d.id,
        titre: t(DOC_LABEL[d.type]),
        sous: d.number,
        at: d.createdAt,
        atText: fmtDate(d.createdAt, false),
        etat: aRegler ? t("à régler") : t("émis le {d}", { d: fmtDate(d.createdAt, false) }),
        ton: (aRegler ? "attend" : undefined) as "attend" | undefined,
        geste: aRegler ? { label: t("Régler"), href: `/moi/ordres/${d.intentId}`, primaire: true } : { label: t("Ouvrir"), href: versLaPiece(d.id) },
        intentId: d.intentId,
      };
    });
  const ops = mine
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((i) => {
      const o = byOffer.get(i.offerId);
      return {
        id: i.id,
        titre: o?.title ?? i.offerId,
        sous: `${t(INTENT_LABEL[i.type])}${i.amount ? ` · ${montant(i, o?.kind)}` : ""} · ${t("réf.")} ${i.ref}`,
        etat: t(INTENT_STATE_LABEL[i.state]),
        etatKey: i.state,
        href: o ? `/offres/${o.id}` : undefined,
      };
    });
  const aRegler = desOperations.filter((d) => d.ton === "attend").length;

  /* ── Rayon 3 · les mouvements de votre argent ──────────────────────
     Trois familles entrent ici qui n'étaient nulle part : le versement de
     votre solde, les prélèvements présentés avec leur préavis, et les avis
     de droits de garde. Un mouvement d'argent sans trace consultable est la
     seule chose que la convention promet et que la page ne donnait pas. */
  const argent = [
    ...miens
      .filter((d) => ARGENT.includes(d.type))
      .map((d) => ({
        clef: `doc-${d.id}`,
        at: d.createdAt,
        titre: t(DOC_LABEL[d.type]),
        sous: d.number,
        etat: t("édité le {d}", { d: fmtDate(d.createdAt, false) }),
        ton: undefined as "fait" | "attend" | undefined,
        geste: { label: t("Ouvrir"), href: versLaPiece(d.id) },
      })),
    ...payouts
      .filter((p) => p.state === "payee")
      .map((p) => ({
        clef: `payout-${p.id}`,
        at: p.closedAt ?? p.askedAt,
        titre: t("Avis de versement"),
        sous: t("{m} FCFA vers votre compte bancaire", { m: fmt(Math.round(p.paidAmount ?? p.askedAmount)) }),
        etat: t("payé le {d}", { d: fmtDate(p.closedAt ?? p.askedAt, false) }),
        ton: "fait" as const,
        geste: { label: t("Le journal"), href: "/moi/performance#operations" },
      })),
    /* UN TIRAGE NE PARAÎT QUE S'IL A ÉTÉ DIT OU PRÉSENTÉ : une échéance
       seulement préparée, ou écartée avant la remise, n'a rien demandé au
       client et n'a donc rien à prouver. */
    ...tirages
      .filter((x) => x.noticeSent || x.state === "remis" || x.state === "encaisse" || x.state === "rejete")
      .map((x) => ({
        clef: `tirage-${x.id}`,
        at: x.settledAt ?? x.handedAt ?? x.announcedAt ?? x.createdAt,
        titre: x.state === "encaisse" ? t("Prélèvement encaissé") : x.state === "rejete" ? t("Prélèvement rejeté") : x.state === "remis" ? t("Prélèvement présenté") : t("Prélèvement annoncé"),
        sous: `${t("{m} FCFA le {d}", { m: fmt(x.amount), d: fmtDate(x.dueOn, false) })} · ${x.ref}`,
        etat: x.state === "encaisse" ? t("encaissé le {d}", { d: fmtDate(x.settledAt ?? x.dueOn, false) }) : x.state === "rejete" ? t("rejeté par votre banque") : t("annoncé le {d}", { d: fmtDate(x.announcedAt ?? x.createdAt, false) }),
        ton: (x.state === "encaisse" ? "fait" : x.state === "rejete" ? "attend" : undefined) as "fait" | "attend" | undefined,
        geste: { label: t("Mes prélèvements"), href: "/moi/prelevements" },
      })),
    ...garde.map((a) => ({
      clef: `garde-${a.id}`,
      at: a.periodTo,
      titre: t("Avis de droits de garde · {p}", { p: a.period }),
      sous: `${a.du > 0 ? t("{m} FCFA", { m: fmt(Math.round(a.du)) }) : t("sans frais")} · ${a.ref}`,
      etat: t("du {a} au {b}", { a: fmtDate(a.periodFrom, false), b: fmtDate(a.periodTo, false) }),
      ton: undefined as "fait" | "attend" | undefined,
      /* UN FRAIS SE CONTESTE SUR UN PAPIER : le geste est ici, à côté du
         montant, et non trois pages plus loin. */
      geste: { label: t("Contester"), href: "/moi/reclamation" },
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  /* ── Rayon 4 · vos démarches ───────────────────────────────────────── */
  const demarches = miens
    .filter((d) => DEMARCHES.includes(d.type))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((d) => ({
      id: d.id,
      titre: t(DOC_LABEL[d.type]),
      sous: `${t("déposée le {d}", { d: fmtDate(d.createdAt, false) })} · ${d.number}`,
      geste: { label: t("Ouvrir"), href: versLaPiece(d.id) },
    }));

  const total = signes.length + desOperations.length + argent.length + demarches.length + (consent.version ? 1 : 0);
  /* Un rayon vide ne compte pas à voix haute : « 0 document » sur une bande
     dit deux fois la même chose que la phrase qui est dessous. Et le pluriel
     se lit du nombre affiché, pas d'une autre liste : « 0 opérations » était
     le pluriel d'un compte qui n'était pas celui-là. */
  const compteDe = (n: number, un: string, plusieurs: string) => (n ? t(n > 1 ? plusieurs : un, { n: String(n) }) : undefined);
  const opsAvecDocs = ops.filter((o) => desOperations.some((d) => d.intentId === o.id)).length;

  return (
    <div className={styles.page}>
      <Link href="/" className={styles.back}>
        ← {t("Portefeuille")}
      </Link>
      <div className={styles.tete}>
        <div className="eyebrow">{t("Vos papiers")}</div>
        <h1 className="display">{t("Mes documents")}</h1>
        <p className={styles.lead}>{t("Tout ce qui porte votre nom et un numéro : ce que vous avez signé, ce que vos opérations ont produit, et les mouvements de votre argent.")}</p>
      </div>

      <div className={styles.barre}>
        <span className="muted">{compteDe(total, "{n} document", "{n} documents") ?? t("Aucun document pour l'instant")}</span>
        <ToutReplier cles={["docs:signes", "docs:operations", "docs:argent", "docs:demarches"]} />
      </div>

      {/* CE QUI SE FABRIQUE OUVRE LA PAGE : c'est le seul papier qui n'existe
          pas encore quand on arrive. SANS POSITION IL N'Y A RIEN À ÉDITER :
          l'attestation sortait avec un tableau vide et une place pour le
          cachet, soit un papier signé qui ne déclare rien. */}
      <section className={styles.editer}>
        <div>
          <b>{t("Éditer un relevé")}</b>
          <small>{tientQuelqueChose ? t("Le relevé de position et l'attestation de détention se fabriquent à la date que vous choisissez.") : t("Dès votre première opération réglée, le relevé de position et l'attestation de détention s'éditent ici.")}</small>
        </div>
        {tientQuelqueChose && <StatementButtons />}
      </section>

      <Pli
        cle="docs:signes"
        titre={t("Ce que vous avez signé")}
        sous={t("Vos engagements : ils ne changent que si vous les reprenez.")}
        compte={compteDe(signes.length + (consent.version ? 1 : 0), "{n} document", "{n} documents")}
        attend={aSigner ? t(aSigner > 1 ? "{n} à signer" : "1 à signer", { n: String(aSigner) }) : undefined}
      >
        {signes.map((d) => (
          <Ligne key={d.id} titre={d.titre} sous={d.sous} etat={d.etat} ton={d.ton} geste={d.geste} />
        ))}
        {/* LE PONT : un texte de la maison devient VOTRE document le jour où
            vous l'acceptez. Il prend alors une date et une version, et il se
            lit dans la version acceptée. */}
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
      </Pli>

      <Pli
        cle="docs:operations"
        titre={t("Ce que vos opérations ont produit")}
        sous={t("Appels de fonds, résultats, avis d'opéré, coupons : ils tombent d'un ordre.")}
        compte={opsAvecDocs ? `${compteDe(opsAvecDocs, "{n} opération", "{n} opérations")} · ${desOperations.length}` : undefined}
        attend={aRegler ? t(aRegler > 1 ? "{n} à régler" : "1 à régler", { n: String(aRegler) }) : undefined}
      >
        <Operations docs={desOperations} ops={ops} />
      </Pli>

      <Pli
        cle="docs:argent"
        titre={t("Les mouvements de votre argent")}
        sous={t("Ce qui entre, ce qui sort, et ce que la conservation coûte.")}
        compte={compteDe(argent.length, "{n} document", "{n} documents")}
      >
        {argent.length === 0 && <p className="muted">{t("Vos versements, prélèvements et avis de garde paraîtront ici.")}</p>}
        {argent.map((x, i) => {
          const an = x.at.slice(0, 4);
          const avant = i > 0 ? argent[i - 1].at.slice(0, 4) : undefined;
          return (
            <div key={x.clef}>
              {an !== avant && <Annee an={an} />}
              <Ligne titre={x.titre} sous={x.sous} etat={x.etat} ton={x.ton} geste={x.geste} />
            </div>
          );
        })}
      </Pli>

      <Pli
        cle="docs:demarches"
        titre={t("Vos démarches")}
        sous={t("Ce qu'on ouvre quand quelque chose ne va pas, ou quand on s'en va.")}
        compte={compteDe(demarches.length, "{n} document", "{n} documents")}
        defaut={demarches.length > 0}
      >
        {demarches.map((d) => (
          <Ligne key={d.id} titre={d.titre} sous={d.sous} geste={d.geste} />
        ))}
        <Ligne
          titre={t("Déposer une réclamation")}
          sous={t("une réponse écrite, puis la médiation COSUMAF si rien ne va")}
          geste={{ label: t("Ouvrir une démarche"), href: "/moi/reclamation" }}
        />
      </Pli>

      {/* LES TEXTES DE LA MAISON ONT LEUR PORTE, et ne sont pas dans la liste :
          ils n'ont pas de numéro, ils ont une version, et ils sont les mêmes
          pour tout le monde. */}
      <div className={styles.pied}>
        <span>
          <b>{t("Les textes de la maison")}</b>
          <small>{t("Mentions, risques, annexe tarifaire, règles des services : les mêmes pour tous, version par version.")}</small>
        </span>
        <Link className="btn sm" href="/moi/textes">
          {t("Textes et conditions")}
        </Link>
      </div>
      <p className={styles.version}>{t("Mentions en vigueur : version {v}.", { v: LEGAL_VERSION })}</p>
    </div>
  );
}
