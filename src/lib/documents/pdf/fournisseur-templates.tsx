import { Document, Page, View } from "@react-pdf/renderer";
import { fmtDate, fmtDateTime } from "@/lib/format";
import type { LigneRapport, RapportFournisseur } from "@/lib/market/rapport-fournisseur";
import { Table, Text, s } from "./primitives";

/**
 * LE RELEVÉ DE QUALITÉ DES DONNÉES DU BOC. DOCUMENT DE TRAVAIL INTERNE.
 *
 * IL NE PORTE PAS L'EN-TÊTE DE LA MAISON, et c'est une décision de Georges du
 * 13 octobre 2026. Un document à en-tête engage : il se signe, il s'envoie,
 * il se cite. Celui-ci sert d'abord à voir, et il se partage avec la bourse
 * quand le desk le juge prêt. Tant qu'il est un outil, il n'a pas à prendre
 * l'apparence d'un courrier.
 *
 * CE QUE CELA CHANGE DANS LE TEXTE, au-delà du bandeau : pas de « nous »
 * institutionnel, pas de formule d'envoi, pas de mention légale. Les constats
 * se suffisent. Le jour où le desk décide de l'adresser, le même rapport se
 * reposera dans la lettre de la maison sans qu'une phrase ne bouge.
 *
 * ON N'IMPRIME PAS TOUT. Au-delà de quarante lignes par chapitre, le PDF
 * renvoie au classeur : un document de cent pages ne se lit pas, et le détail
 * exhaustif a déjà son support.
 */

const PLAFOND = 40;

const extrait = (lignes: LigneRapport[], cols: { label: string; flex?: number; mono?: boolean; right?: boolean }[], prendre: (l: LigneRapport) => (string | number)[]) => (
  <>
    <Table cols={cols} rows={lignes.slice(0, PLAFOND).map(prendre)} />
    {lignes.length > PLAFOND && <Text style={s.small}>… et {lignes.length - PLAFOND} autres, dans le classeur.</Text>}
  </>
);

export function RapportFournisseurPdf({ r }: { r: RapportFournisseur }) {
  const titre = `Qualité des données du BOC · ${r.du} au ${r.au}`;
  const ecrites = r.parSort.filter((x) => x.ecrite).reduce((a, x) => a + x.remarques, 0);
  const manquantes = r.parSort.filter((x) => !x.ecrite && x.sort !== "sans_objet").reduce((a, x) => a + x.remarques, 0);

  return (
    <Document title={titre}>
      <Page size="A4" style={[s.page, { paddingTop: 34 }]}>
        <View style={s.body}>
          <Text style={s.eyebrow}>Document de travail interne</Text>
          <Text style={s.h1}>Qualité des données du Bulletin Officiel de la Cote</Text>
          <Text style={s.ref}>
            {fmtDate(r.du)} au {fmtDate(r.au)} · {r.seances} séances · établi le {fmtDateTime(r.genere)}
          </Text>

          <Text style={s.p}>
            Chaque bulletin officiel de la cote est lu automatiquement à sa parution, puis relu à chaque progrès du lecteur. Ce relevé rend compte de ce que cette lecture rencontre sur {r.seances} séances, dont {r.seancesSansRemarque} se lisent sans aucune remarque.
          </Text>
          <Text style={s.p}>
            Il sépare trois choses, et l&apos;ordre importe. Ce que le document publie d&apos;inexact et qui ne peut pas être corrigé de notre côté. Ce qui a été réparé pour pouvoir être utilisé. Ce qui n&apos;a pas pu être lu, qui est une limite du lecteur et non du document.
          </Text>

          <View style={s.box}>
            <Text style={[s.b, { marginBottom: 3 }]}>En trois nombres</Text>
            <Text>
              {r.publication.length} lignes dont les chiffres publiés ne peuvent pas être justes · {ecrites} valeurs retenues malgré une remarque · {manquantes} valeurs absentes des registres.
            </Text>
          </View>

          {/* ---- 1 ---- */}
          <Text style={[s.h1, { fontSize: 12, marginTop: 14 }]}>1 · Ce que le bulletin publie d&apos;inexact</Text>
          {r.publication.length === 0 ? (
            <Text style={s.p}>Aucune sur la période.</Text>
          ) : (
            <>
              <Text style={s.p}>
                Ces {r.publication.length} lignes ne relèvent pas d&apos;une difficulté de lecture. Le document porte une valeur ou un format qui ne peut pas être juste, et sa propre arithmétique le démontre. Elles ne sont pas corrigées : lorsque les pourcentages imprimés sont eux-mêmes calculés sur la cellule en cause, aucun contrôle interne au document ne reste disponible pour valider une correction.
              </Text>
              {extrait(r.publication, [{ label: "Séance", flex: 0.9 }, { label: "Instrument", flex: 1.7 }, { label: "Cellule imprimée", flex: 1, mono: true }, { label: "Constat", flex: 3.4 }], (l) => [fmtDate(l.seance), l.objet || "—", l.imprime || "—", l.diagnostic])}
            </>
          )}

          {/* ---- 2 ---- */}
          <Text style={[s.h1, { fontSize: 12, marginTop: 14 }]} break={r.publication.length > 14}>
            2 · Ce qui a été corrigé
          </Text>
          <Text style={s.p}>
            {r.corrections.length === 0
              ? "Aucune correction sur la période."
              : "Une cellule n'est réparée que lorsque le bulletin valide lui-même la correction : une date restée en numéro de série n'est retenue que si la variation imprimée sur la rangée s'accorde avec les deux valeurs liquidatives, au centième de point près. La valeur d'origine est conservée, donc aucune retouche n'est irréversible. Cette liste est l'écart exact entre la base et la publication."}
          </Text>
          {r.corrections.length > 0 && extrait(r.corrections, [{ label: "Séance", flex: 0.9 }, { label: "Instrument", flex: 1.9 }, { label: "Imprimé", flex: 0.9, mono: true }, { label: "Retenu", flex: 0.9, mono: true }, { label: "Motif", flex: 3 }], (l) => [fmtDate(l.seance), l.objet || "—", l.imprime || "—", l.retenu || "—", l.diagnostic])}

          {/* ---- 3 ---- */}
          <Text style={[s.h1, { fontSize: 12, marginTop: 14 }]} break>
            3 · Ce qui a été écarté
          </Text>
          <Text style={s.p}>
            {r.ecartees.length === 0 ? "Aucune valeur écartée sur la période." : `${r.ecartees.length} valeurs ont été lues puis refusées, faute de pouvoir être vérifiées. Elles manquent dans les registres, et c'est une décision : une donnée absente vaut mieux qu'une donnée inventée.`}
          </Text>
          {r.ecartees.length > 0 && extrait(r.ecartees, [{ label: "Séance", flex: 0.9 }, { label: "Instrument", flex: 1.9 }, { label: "Motif", flex: 4 }], (l) => [fmtDate(l.seance), l.objet || "—", l.diagnostic])}

          {/* ---- 4 ---- */}
          <Text style={[s.h1, { fontSize: 12, marginTop: 14 }]}>4 · Ce qui n&apos;a pas pu être lu</Text>
          <Text style={s.p}>
            {r.perdues.length === 0
              ? "Aucune ligne perdue sur la période."
              : `${r.perdues.length} lignes sont présentes dans le document et le lecteur ne les a pas extraites. La cause tient le plus souvent à la couche texte du PDF, où les cellules d'une même rangée se touchent sans séparateur : l'œil distingue les colonnes, le fichier ne les sépare pas. Un export dont la couche texte conserve ces séparations, ou un fichier de données déposé à côté du PDF, supprimerait cette catégorie entière.`}
          </Text>
          {r.perdues.length > 0 && extrait(r.perdues, [{ label: "Séance", flex: 0.9 }, { label: "Instrument", flex: 1.6 }, { label: "Constat", flex: 4 }], (l) => [fmtDate(l.seance), l.objet || "—", l.diagnostic])}

          {/* ---- synthèse ---- */}
          <Text style={[s.h1, { fontSize: 12, marginTop: 16 }]} break>
            Synthèse par devenir de la donnée
          </Text>
          <Table
            cols={[{ label: "Devenir", flex: 1.5 }, { label: "Dans les registres", flex: 1.2 }, { label: "Remarques", flex: 0.8, right: true }, { label: "Séances", flex: 0.8, right: true }]}
            rows={r.parSort.map((x) => [x.libelle, x.ecrite ? "oui" : "non", x.remarques, x.seances])}
            total={["Total", "", r.remarques, r.seances]}
          />
          <Text style={s.small}>Le détail ligne à ligne, avec le texte brut de chaque rangée, figure dans le classeur.</Text>
        </View>
        <Text style={s.pageNo} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>
    </Document>
  );
}
