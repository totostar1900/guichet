import { View } from "@react-pdf/renderer";
import { passage } from "../passages-catalog";
import { COMPANY, SETTLEMENT } from "@/lib/config";
import type { ClientFile } from "@/lib/domain/kyc";
import type { MandatPrelevement } from "@/lib/domain/mandat";
import { fmt, fmtDate, fmtDateTime, localIso } from "@/lib/format";
import { DOC_LABEL, KIND_LABEL, RISK_LABEL } from "@/lib/kyc/checklist";
import { Addr, KV, Letter, Sig, Signature, Table, Text, s } from "./primitives";

const ROLE = { representant: "Représentant légal", mandataire: "Mandataire", beneficiaire_effectif: "Bénéficiaire effectif" };

/**
 * Convention d'ouverture de compte-titres. Rendered blank as the model the
 * client reads, and filled once accepted (code, timestamp) : the accepted copy
 * is the record of the electronic acceptance.
 */
export function Convention({ number, file, now, texts }: { number: string; file?: ClientFile; now: Date; texts?: Record<string, string> }) {
  const id = file?.identity;
  const art = (key: string, vars: Record<string, string | undefined> = {}) => passage("convention", key, texts, vars);
  const articles: [string, string][] = [
    ["1. Objet", art("art_objet", { societe: COMPANY.legalName, agrement: COMPANY.licence })],
    ["2. Conservation", art("art_conservation")],
    ["3. Espèces", art("art_especes")],
    ["4. Ordres", art("art_ordres")],
    ["5. Information et catégorisation", art("art_information", { categorie: file?.profile.category === "professionnel" ? "professionnel" : "non professionnel" })],
    ["6. Tarifs", art("art_tarifs")],
    ["7. Communications", art("art_communications")],
    ["8. Données personnelles et LBC/FT", art("art_donnees")],
    ["9. Procurations et succession", art("art_procurations")],
    ["10. Réclamations, durée, résiliation", art("art_reclamations", { email: COMPANY.email })],
  ];
  return (
    <Letter heading={`Convention · ${number}`}>
      <Text style={s.h1}>Convention d&apos;ouverture de compte-titres</Text>
      <Text style={s.ref}>
        {number} · {file ? `établie le ${fmtDate(localIso(now))}` : "modèle"} · version 2026-09
      </Text>
      <Addr
        blocks={[
          ["Le Titulaire", file ? [id!.name, KIND_LABEL[file.kind], [id!.address, id!.city, id!.country].filter(Boolean).join(", "), id!.phone ?? "", id!.email ?? ""] : ["………………………………", "………………………………"]],
          ["L'Intermédiaire", [COMPANY.legalName, COMPANY.licence, COMPANY.address]],
        ]}
      />
      {articles.map(([t, body]) => (
        <View key={t} style={{ marginBottom: 6 }}>
          <Text style={s.b}>{t}</Text>
          <Text style={s.p}>{body}</Text>
        </View>
      ))}
      {file?.consents.conventionAt ? (
        <View style={s.box}>
          <Text>
            <Text style={s.b}>Acceptation électronique.</Text> Convention acceptée le {fmtDateTime(file.consents.conventionAt)} par {file.consents.conventionMethod ?? "code à usage unique"} envoyé au {file.consents.conventionTo ?? file.identity.phone ?? file.identity.email}. Consentement données : {file.consents.dataAt ? fmtDateTime(file.consents.dataAt) : "—"}. Notifications WhatsApp : {file.consents.whatsappAt ? `oui (${fmtDateTime(file.consents.whatsappAt)})` : "non"}.
          </Text>
        </View>
      ) : (
        <Sig left="Le Titulaire : « lu et approuvé », date et signature" right={`${COMPANY.legalName}`} />
      )}
    </Letter>
  );
}

/** Account-opening file for the SVT / custodian : the KYC summary they need, whatever the account structure. */
export function DossierOuverture({ number, file, now, texts }: { number: string; file: ClientFile; now: Date; texts?: Record<string, string> }) {
  const id = file.identity;
  return (
    <Letter heading={`Dossier d'ouverture · ${number}`}>
      <Text style={s.h1}>Demande d&apos;ouverture de sous-compte nominatif : {id.name}</Text>
      <Text style={s.ref}>
        {number} · établi le {fmtDate(localIso(now))} · dossier KYC {file.id.slice(0, 8)} · {KIND_LABEL[file.kind]}
      </Text>
      <Text style={s.p}>{passage("dossier_svt", "demande", texts, { societe: COMPANY.legalName })}</Text>
      <KV
        left
        rows={[
          ["Client", id.name],
          ["Type", KIND_LABEL[file.kind]],
          ["Adresse", [id.address, id.city, id.country].filter(Boolean).join(", ") || "—"],
          ["Téléphone · e-mail", [id.phone, id.email].filter(Boolean).join(" · ") || "—"],
          ...(file.kind === "physique" ? ([["Naissance · nationalité", [id.birthDate ? fmtDate(id.birthDate) : "", id.nationality].filter(Boolean).join(" · ") || "—"], ["Pièce d'identité", `${id.idType ?? "—"} n° ${id.idNumber ?? "—"}${id.idExpiresOn ? `, expire le ${fmtDate(id.idExpiresOn)}` : ""}`], ["Profession", id.profession ?? "—"]] as [string, string][]) : ([["Immatriculation", id.registration ?? "—"], ["Forme", `${id.legalForm ?? "—"}${file.kind === "groupement" && /indivision/i.test(id.legalForm ?? "") ? " : plafond 25 000 000 FCFA de nominal" : ""}`], ...(id.decisionRule ? [["Règle de décision", id.decisionRule]] : [])] as [string, string][])),
          ["NIU", id.taxId ?? "—"],
          ["Résident hors CEMAC", id.residentAbroad ? "oui" : "non"],
          ["Origine des fonds", file.funds.source ?? "—"],
          ["Banque de règlement", file.funds.bankName ?? "—"],
          ["PPE", file.funds.pep || file.persons.some((p) => p.pep) ? "oui : diligence renforcée" : "non"],
          ["Notation de risque", file.review.risk ? RISK_LABEL[file.review.risk] : "—"],
          ["Catégorie", file.profile.category === "professionnel" ? "professionnel" : "non professionnel"],
        ]}
      />
      {file.persons.length > 0 && (
        <Table cols={[{ label: "Rôle", flex: 1.4 }, { label: "Nom", flex: 2 }, { label: "Pièce", flex: 1.2, mono: true }, { label: "Part", right: true }, { label: "PPE" }]} rows={file.persons.map((p) => [ROLE[p.role], p.name, p.idNumber ?? "—", p.share ? `${p.share} %` : "—", p.pep ? "oui" : "non"])} />
      )}
      <Text style={[s.p, s.b]}>Pièces vérifiées</Text>
      <Table cols={[{ label: "Pièce", flex: 2.5 }, { label: "Fichier", flex: 2 }, { label: "Reçue le", flex: 1.2 }, { label: "Vérifiée" }]} rows={file.documents.map((d) => [DOC_LABEL[d.kind], d.fileName, fmtDate(d.uploadedAt), d.verified ? "oui" : "—"])} />
      <Text style={s.p}>
        Convention d&apos;ouverture de compte-titres acceptée le {file.consents.conventionAt ? fmtDateTime(file.consents.conventionAt) : "—"}. Prochaine revue KYC : {file.review.nextReviewOn ? fmtDate(file.review.nextReviewOn) : "—"}.
      </Text>
      <Sig left={`Pour ${COMPANY.legalName} : responsable de la conformité`} right="Réception du dépositaire : n° de compte attribué, date, visa" />
    </Letter>
  );
}

/* ---------------- Mandat de prélèvement ---------------- */

/**
 * CE QUE LE CLIENT AUTORISE, EN UNE PAGE QU'IL GARDE.
 *
 * Un prélèvement se conteste. La pièce doit donc porter tout ce qu'une
 * contestation invoque : qui débite, quel compte, jusqu'à combien, quand, et
 * sous quelle référence. Sa banque la demandera, et une autorisation qu'on ne
 * peut pas produire ne vaut rien.
 *
 * Le plafond est écrit en gras et séparé du montant courant : c'est lui
 * l'engagement, et c'est la même règle que le plafond « au plus » d'un ordre.
 */
export function MandatPrelevementDoc({ number, mandat, now }: { number: string; mandat: MandatPrelevement; now: Date }) {
  const mensuel = mandat.objet === "provision" && mandat.amount != null;
  return (
    <Letter heading={`Mandat de prélèvement · ${number}`}>
      <Text style={s.h1}>Autorisation de prélèvement sur compte bancaire</Text>
      <Text style={s.ref}>
        {number} · établi le {fmtDate(localIso(now))} · référence du mandat {mandat.ref}
      </Text>
      <Addr
        blocks={[
          ["Débiteur", [mandat.accountHolder, mandat.bankName, mandat.bankAccount]],
          ["Créancier", [COMPANY.legalName, "Compte de règlement clients (ségrégué)", SETTLEMENT.bank]],
        ]}
      />
      <KV
        rows={[
          ["Objet du mandat", mandat.objet === "provision" ? "Alimentation de la provision du client" : "Alimentation d'une instruction permanente"],
          ...(mensuel ? ([["Montant prélevé chaque mois", `${fmt(mandat.amount ?? 0)} FCFA`]] as [string, string][]) : []),
          ...(mandat.dayOfMonth ? ([["Jour du prélèvement", `le ${mandat.dayOfMonth} de chaque mois`]] as [string, string][]) : []),
        ]}
        total={["Plafond par échéance, que la maison ne dépasse jamais", `${fmt(mandat.maxAmount)} FCFA`]}
      />
      <Text style={s.p}>
        Le débiteur autorise {COMPANY.legalName} à présenter des ordres de prélèvement sur le compte désigné ci-dessus, et sa banque à les régler, dans la limite du plafond par échéance. Le compte débité est ouvert au nom du
        débiteur ; aucun prélèvement n&apos;est présenté sur le compte d&apos;un tiers.
      </Text>
      <Text style={s.p}>
        Chaque prélèvement est annoncé avant d&apos;être présenté, avec son montant et sa date, et le débiteur peut l&apos;arrêter jusqu&apos;à la veille. Il peut révoquer ce mandat à tout moment, sans motif et sans frais, depuis son
        espace ; la révocation prend effet avant l&apos;échéance suivante. Le présent mandat ne vaut que pour l&apos;objet désigné : il n&apos;autorise aucun autre prélèvement.
      </Text>
      <Text style={s.p}>
        En cas de rejet faute de provision, {COMPANY.legalName} ne représente le prélèvement qu&apos;une fois, après en avoir informé le débiteur. Au second rejet, le mandat est suspendu et un conseiller prend contact. Toute
        contestation d&apos;un prélèvement se fait auprès de sa banque dans les délais qu&apos;elle applique, en citant la référence {mandat.ref}.
      </Text>
      <Signature intent={{ signedAt: mandat.signedAt, signedMethod: mandat.signedMethod, signedTo: mandat.signedTo, ref: mandat.ref }} qui="débiteur" />
    </Letter>
  );
}
