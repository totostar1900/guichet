import { View } from "@react-pdf/renderer";
import { passage } from "../passages-catalog";
import { COMPANY } from "@/lib/config";
import type { ClientFile } from "@/lib/domain/kyc";
import { fmtDate, fmtDateTime, localIso } from "@/lib/format";
import { DOC_LABEL, KIND_LABEL, RISK_LABEL } from "@/lib/kyc/checklist";
import { Addr, KV, Letter, Sig, Table, Text, s } from "./primitives";

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
            <Text style={s.b}>Acceptation électronique.</Text> Convention acceptée le {fmtDateTime(file.consents.conventionAt)} par {file.consents.conventionMethod ?? "code à usage unique"} envoyé au {file.identity.phone ?? file.identity.email}. Consentement données : {file.consents.dataAt ? fmtDateTime(file.consents.dataAt) : "—"}. Notifications WhatsApp : {file.consents.whatsappAt ? `oui (${fmtDateTime(file.consents.whatsappAt)})` : "non"}.
          </Text>
        </View>
      ) : (
        <Sig left="Le Titulaire : « lu et approuvé », date et signature" right={`${COMPANY.legalName}`} />
      )}
    </Letter>
  );
}

/** Account-opening file for the SVT / custodian : the KYC summary they need, whatever the account structure. */
export function DossierOuverture({ number, file, now }: { number: string; file: ClientFile; now: Date }) {
  const id = file.identity;
  return (
    <Letter heading={`Dossier d'ouverture · ${number}`}>
      <Text style={s.h1}>Demande d&apos;ouverture de sous-compte nominatif : {id.name}</Text>
      <Text style={s.ref}>
        {number} · établi le {fmtDate(localIso(now))} · dossier KYC {file.id.slice(0, 8)} · {KIND_LABEL[file.kind]}
      </Text>
      <Text style={s.p}>
        {COMPANY.legalName} demande l&apos;ouverture d&apos;un sous-compte titres nominatif au nom du client ci-dessous, sous son regroupement, et atteste avoir procédé à son identification et à la vérification de ses pièces conformément à la réglementation CEMAC en matière de LBC/FT.
      </Text>
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
