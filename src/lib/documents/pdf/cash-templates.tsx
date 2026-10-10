import { View } from "@react-pdf/renderer";
import { passage } from "../passages-catalog";
import { COMPANY } from "@/lib/config";
import type { Contact } from "@/lib/domain/types";
import type { AvisGarde } from "@/lib/domain/garde";
import { MOTIFS, type Tirage } from "@/lib/domain/prelevement";
import { fmt, fmtDate, fmtDateTime, localIso } from "@/lib/format";
import { Addr, Letter, Table, Text, s } from "./primitives";

/**
 * LES TROIS AVIS D'ARGENT : ce qui sort, ce qui est prélevé, ce que la garde
 * coûte.
 *
 * Ils manquaient, et c'était le seul endroit où la convention promettait une
 * trace que la maison ne donnait pas : « un avis d'opéré par opération, un
 * relevé de position », et rien pour un versement reçu, un prélèvement
 * présenté ou un trimestre de garde. Le client voyait les mouvements dans son
 * journal, sans pièce à citer.
 *
 * UN AVIS SE CITE DANS UNE CONTESTATION : il porte donc une référence, la
 * date de valeur, le compte concerné et, pour la garde, le détail ligne à
 * ligne. Le reste est au gabarit de la maison, comme les autres avis.
 */

const titulaire = (c: Contact) => [c.name, c.segment, c.phone ?? "", c.email ?? ""].filter(Boolean);

export interface VersementCtx {
  number: string;
  contact: Contact;
  /** Ce qui a été demandé, et ce qui a été versé : l'écart se lit, il ne se tait pas. */
  askedAmount: number;
  askedAt: string;
  paidAmount: number;
  paidAt: string;
  /** La banque du client, telle que le dossier la déclare. */
  banque?: { name?: string; ribEnd?: string };
  now: Date;
  texts?: Record<string, string>;
}

export function AvisVersementPdf({ number, contact, askedAmount, askedAt, paidAmount, paidAt, banque, now, texts }: VersementCtx) {
  const compte = [banque?.name, banque?.ribEnd ? `…${banque.ribEnd}` : undefined].filter(Boolean).join(" ") || "votre compte bancaire déclaré";
  /* L'ÉCART SE DIT, PARCE QU'IL EXISTE : le desk recalcule au moment du
     virement, et un coupon tombé entre-temps change le montant. Le taire
     ferait croire à une erreur. */
  const ecart = Math.round(paidAmount - askedAmount);
  return (
    <Letter heading={`Avis de versement · ${number}`}>
      <Text style={s.h1}>Avis de versement</Text>
      <Text style={s.ref}>
        {number} · émis le {fmtDateTime(now.toISOString())}
      </Text>
      <Addr blocks={[["Titulaire", titulaire(contact)], ["Compte crédité", [compte, "déclaré à l'ouverture du compte-titres"]]]} />
      <Table
        cols={[{ label: "Demandé le", flex: 1.2 }, { label: "Montant demandé (FCFA)", flex: 1.4, right: true }, { label: "Versé le", flex: 1.2 }, { label: "Montant versé (FCFA)", flex: 1.4, right: true }]}
        rows={[[fmtDate(askedAt), fmt(Math.round(askedAmount)), fmtDate(paidAt), fmt(Math.round(paidAmount))]]}
      />
      {ecart !== 0 && (
        <Text style={s.p}>
          Le disponible avait bougé de {ecart > 0 ? "+" : ""}
          {fmt(ecart)} FCFA entre votre demande et le virement : c'est le montant réellement disponible qui est versé.
        </Text>
      )}
      <Text style={s.p}>{passage("versement", "portee", texts, { compte })}</Text>
      <Text style={s.small}>
        {COMPANY.legalName} · {COMPANY.licence} · Ce mouvement figure à votre journal des espèces à sa date de valeur.
      </Text>
    </Letter>
  );
}

export interface TirageCtx {
  number: string;
  contact: Contact;
  tirage: Tirage;
  /** Le mandat qui l'autorise : sa référence et son plafond sont la mesure du tirage. */
  mandat: { ref: string; maxAmount: number; bankName: string; bankAccount: string };
  now: Date;
  texts?: Record<string, string>;
}

export function AvisTiragePdf({ number, contact, tirage, mandat, now, texts }: TirageCtx) {
  const rejet = tirage.state === "rejete";
  const motif = tirage.rejectCode ? MOTIFS[tirage.rejectCode] : undefined;
  const fin = mandat.bankAccount.replace(/\s/g, "").slice(-4);
  return (
    <Letter heading={`Avis de prélèvement · ${number}`}>
      <Text style={s.h1}>{rejet ? "Avis de prélèvement rejeté" : "Avis de prélèvement"}</Text>
      <Text style={s.ref}>
        {number} · émis le {fmtDateTime(now.toISOString())} · tirage {tirage.ref}
      </Text>
      <Addr blocks={[["Titulaire", titulaire(contact)], ["Compte débité", [mandat.bankName, `…${fin}`, `Mandat ${mandat.ref}`]]]} />
      <Table
        cols={[{ label: "Annoncé le", flex: 1.2 }, { label: "Présenté le", flex: 1.2 }, { label: "Montant (FCFA)", flex: 1.3, right: true }, { label: "Plafond du mandat (FCFA)", flex: 1.6, right: true }, { label: "Sort", flex: 1.4 }]}
        rows={[
          [
            tirage.announcedAt ? fmtDate(tirage.announcedAt) : "—",
            fmtDate(tirage.dueOn),
            fmt(Math.round(tirage.amount)),
            fmt(Math.round(mandat.maxAmount)),
            rejet ? "Rejeté" : `Encaissé le ${fmtDate(tirage.settledAt ?? tirage.dueOn)}`,
          ],
        ]}
      />
      {rejet && motif && (
        <View style={{ marginBottom: 6 }}>
          <Text style={s.b}>Cause du rejet</Text>
          <Text style={s.p}>
            {motif.libelle}
            {tirage.rejectNote ? ` · ${tirage.rejectNote}` : ""}
          </Text>
          <Text style={s.p}>{motif.auClient}</Text>
        </View>
      )}
      <Text style={s.p}>{passage("tirage", "portee", texts)}</Text>
      <Text style={s.small}>
        {COMPANY.legalName} · {COMPANY.licence} · Un prélèvement encaissé figure à votre journal des espèces à sa date de valeur.
      </Text>
    </Letter>
  );
}

export interface GardeCtx {
  number: string;
  contact: Contact;
  avis: AvisGarde;
  now: Date;
  texts?: Record<string, string>;
}

export function AvisGardePdf({ number, contact, avis, now, texts }: GardeCtx) {
  /* LE DÉTAIL LIGNE À LIGNE EST LE DOCUMENT : un frais qu'on ne voit qu'en
     total est un frais qu'on subit ; celui dont on lit l'assiette, les jours
     et le taux est un frais qu'on vérifie. */
  const lignes = avis.lignes.map((l) => [l.titre, fmt(Math.round(l.assiette)), String(l.jours), l.exoneree ? "exonérée" : `${(avis.bareme.bps / 100).toLocaleString("fr-FR")} %`, fmt(Math.round(l.brut))]);
  return (
    <Letter heading={`Droits de garde · ${number}`}>
      <Text style={s.h1}>Avis de droits de garde</Text>
      <Text style={s.ref}>
        {number} · {avis.period} · du {fmtDate(avis.periodFrom)} au {fmtDate(avis.periodTo)} · émis le {fmtDate(localIso(now))}
      </Text>
      <Addr blocks={[["Titulaire", titulaire(contact)], ["Barème appliqué", [`${(avis.bareme.bps / 100).toLocaleString("fr-FR")} % par an`, avis.bareme.minimum ? `minimum ${fmt(avis.bareme.minimum)} FCFA par période` : "sans minimum", avis.bareme.franchise ? `franchise ${fmt(avis.bareme.franchise)} FCFA` : "sans franchise"]]]} />
      <Table
        cols={[{ label: "Ligne gardée", flex: 2.4 }, { label: "Assiette (FCFA)", flex: 1.4, right: true }, { label: "Jours", flex: 0.8, right: true }, { label: "Taux", flex: 1 }, { label: "Droits (FCFA)", flex: 1.3, right: true }]}
        rows={lignes.length ? lignes : [["Aucune ligne gardée sur la période", "—", "—", "—", "0"]]}
      />
      <Table cols={[{ label: "Assiette moyenne (FCFA)", flex: 1.6, right: true }, { label: "Droits bruts (FCFA)", flex: 1.4, right: true }, { label: "Dû (FCFA)", flex: 1.2, right: true }]} rows={[[fmt(Math.round(avis.assietteMoyenne)), fmt(Math.round(avis.brut)), fmt(Math.round(avis.du))]]} />
      {avis.raison && <Text style={s.p}>{avis.raison}</Text>}
      {avis.plancher && <Text style={s.p}>Le minimum trimestriel du barème s&apos;applique : les droits calculés lui étaient inférieurs.</Text>}
      <Text style={s.p}>{avis.du > 0 ? `Prélevé sur votre solde, à la date de cet avis.` : `Aucun montant n'a été prélevé.`}</Text>
      <Text style={s.p}>{passage("garde", "portee", texts)}</Text>
      <Text style={s.small}>
        {COMPANY.legalName} · {COMPANY.licence} · Toute réclamation se fait dans les trente jours, en citant la référence {avis.ref}.
      </Text>
    </Letter>
  );
}
