/**
 * LES TROIS MODÈLES, DU TEXTE DE LA MAISON À LA SOUMISSION CHEZ META.
 *
 * Recopier trois modèles à la main dans WhatsApp Manager, c'est six saisies
 * (trois modèles, deux langues) de corps à variables numérotées, d'exemples
 * et de boutons. Une virgule déplacée ne se voit pas : le modèle est approuvé
 * tel qu'il a été tapé, et c'est l'envoi qui échoue ensuite, à chaque
 * message, avec un code que seule la réponse de l'API porte.
 *
 * Ce script lit le domicile du sujet, `docs/modeles-whatsapp.md`, et en tire
 * les six charges exactes de l'API de Meta. Le texte n'est donc jamais tapé
 * deux fois. Le cliquet `src/test/modeles-whatsapp.test.ts` importe ce même
 * lecteur : si le document dérive, c'est la suite de tests qui le dit, pas un
 * examinateur dans trois jours.
 *
 *   node scripts/modeles-whatsapp.mjs                 les six charges, à l'écran
 *   node scripts/modeles-whatsapp.mjs --ecrire <dir>  une par fichier
 *   node scripts/modeles-whatsapp.mjs --etat          ce que Meta en a fait
 *   node scripts/modeles-whatsapp.mjs --soumettre     les envoie pour examen
 *
 * Les deux derniers exigent WHATSAPP_TOKEN (jeton système) et
 * WHATSAPP_WABA_ID. CE N'EST PAS WHATSAPP_PHONE_ID : le numéro envoie les
 * messages, le compte business porte les modèles, et les confondre rend un
 * « Unsupported get request » qui ne dit pas lequel des deux manque.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DOC = "docs/modeles-whatsapp.md";
const GRAPH = "https://graph.facebook.com/v21.0";

/** Les langues soumises, et le code que Meta attend pour chacune. */
export const LANGUES = [
  { titre: "française", code: "fr" },
  { titre: "anglaise", code: "en" },
];

const bloc = (s, depuis) => {
  const a = s.indexOf("```", depuis);
  if (a < 0) throw new Error(`${DOC} : barrière de code introuvable`);
  const b = s.indexOf("```", a + 3);
  return s.slice(a + 3, b).trim();
};

const apres = (s, titre, quoi) => {
  const i = s.indexOf(titre);
  if (i < 0) throw new Error(`${DOC} : « ${titre} » introuvable sous ${quoi}`);
  return bloc(s, i);
};

/**
 * LE DOCUMENT, RELU COMME UNE STRUCTURE.
 *
 * Les titres de premier niveau découpent les modèles ; le nom se lit dans le
 * titre plutôt que dans son rang, pour qu'insérer un quatrième modèle au
 * milieu ne casse rien.
 */
export function lireLesModeles(fichier = DOC) {
  const d = readFileSync(fichier, "utf8");
  const titres = [...d.matchAll(/^# .*$/gm)];
  const modeles = [];
  for (const [i, t] of titres.entries()) {
    const nom = t[0].match(/guichet_\w+/)?.[0];
    if (!nom) continue;
    const s = d.slice(t.index, titres[i + 1]?.index);

    const categorie = s.match(/\(`?(UTILITY|MARKETING)`?\)/)?.[1];
    if (!categorie) throw new Error(`${nom} : catégorie (UTILITY ou MARKETING) introuvable`);

    /* Les trois parties fixes se lisent de la même façon, par langue : un
       modèle soumis en anglais dont l'en-tête et le pied restent français est
       mi-traduit, et Meta examine le modèle entier, pas seulement son corps. */
    const entete = {};
    const corps = {};
    const pied = {};
    for (const { titre, code } of LANGUES) {
      entete[code] = apres(s, `### En-tête, version ${titre}`, nom);
      corps[code] = apres(s, `### Corps, version ${titre}`, nom);
      pied[code] = apres(s, `### Pied de page, version ${titre}`, nom);
    }

    /* Les exemples viennent du tableau des variables : première colonne
       « {{n} } », dernière colonne l'exemple entre accents graves. Meta les
       exige à la soumission, et un modèle sans exemple est refusé sans que
       le motif nomme la colonne manquante. */
    const exemples = [];
    for (const m of s.matchAll(/^\|\s*`\{\{(\d+)\}\}`\s*\|[^|]*\|\s*`([^`]+)`\s*\|/gm)) exemples[Number(m[1]) - 1] = m[2];
    if (exemples.length === 0 || exemples.some((x) => !x)) throw new Error(`${nom} : exemples de variables manquants ou à trous`);

    /* Les boutons sont écrits en une forme stricte, « - `TYPE` · `libellé`
       [· `url`] », pour être lus sans deviner. La prose qui les entoure dit
       pourquoi ils sont là ; elle n'est pas soumise. */
    const boutons = [];
    for (const m of s.matchAll(/^- `(URL|REPONSE_RAPIDE)` · `([^`]+)`(?: · `([^`]+)`)?/gm)) {
      if (m[1] === "URL") {
        if (!m[3]) throw new Error(`${nom} : bouton URL « ${m[2]} » sans adresse`);
        boutons.push({ type: "URL", text: m[2], url: m[3] });
      } else boutons.push({ type: "QUICK_REPLY", text: m[2] });
    }

    modeles.push({ nom, categorie, entete, corps, pied, boutons, exemples });
  }
  if (modeles.length === 0) throw new Error(`${DOC} : aucun modèle lu, ce qui ressemble trait pour trait à un succès`);
  return modeles;
}

/** Le nombre de variables d'un corps, par leur numérotation. */
export const variablesDe = (corps) => [...new Set([...corps.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1])))].sort((a, b) => a - b);

/**
 * LA CHARGE D'UN MODÈLE, DANS UNE LANGUE.
 *
 * `allow_category_change` est laissé de côté, et c'est un choix : il évite un
 * refus en laissant Meta reclasser le modèle, donc changer son tarif, sans
 * que personne ne l'ait décidé. Un refus se lit et se répond ; une
 * requalification silencieuse se découvre sur la facture.
 */
export function charge(m, code) {
  const corps = m.corps[code];
  const n = variablesDe(corps).length;
  const exemples = m.exemples.slice(0, n);
  if (exemples.length !== n) throw new Error(`${m.nom} ${code} : ${n} variables, ${exemples.length} exemples`);
  const composants = [
    { type: "HEADER", format: "TEXT", text: m.entete[code] },
    { type: "BODY", text: corps, ...(n ? { example: { body_text: [exemples] } } : {}) },
    { type: "FOOTER", text: m.pied[code] },
  ];
  if (m.boutons.length) composants.push({ type: "BUTTONS", buttons: m.boutons });
  return { name: m.nom, language: code, category: m.categorie, components: composants };
}

export const lesSixCharges = (fichier = DOC) => lireLesModeles(fichier).flatMap((m) => LANGUES.map(({ code }) => charge(m, code)));

/* ---------------------------------------------------------------- la ligne de commande */

const compte = () => {
  const token = process.env.WHATSAPP_TOKEN;
  const waba = process.env.WHATSAPP_WABA_ID;
  if (!token || !waba) {
    console.error("Il manque WHATSAPP_TOKEN et/ou WHATSAPP_WABA_ID.");
    console.error("Le second n'est pas WHATSAPP_PHONE_ID : WhatsApp Manager › Paramètres › identifiant du compte business.");
    process.exit(2);
  }
  return { token, waba };
};

async function etat() {
  const { token, waba } = compte();
  const url = `${GRAPH}/${waba}/message_templates?fields=name,language,status,category,rejected_reason&limit=50`;
  const r = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  const j = await r.json();
  if (!r.ok) {
    console.error(`Meta a refusé la lecture : ${j.error?.message ?? r.status}`);
    process.exit(1);
  }
  const nos = new Set(lireLesModeles().map((m) => m.nom));
  const siens = j.data ?? [];
  for (const t of siens.filter((x) => nos.has(x.name))) {
    console.log(`${t.name} [${t.language}] ${t.status} ${t.category}${t.rejected_reason && t.rejected_reason !== "NONE" ? ` : ${t.rejected_reason}` : ""}`);
  }
  for (const n of nos) {
    for (const { code } of LANGUES) {
      if (!siens.some((x) => x.name === n && x.language === code)) console.log(`${n} [${code}] JAMAIS SOUMIS`);
    }
  }
}

async function soumettre() {
  const { token, waba } = compte();
  for (const c of lesSixCharges()) {
    const r = await fetch(`${GRAPH}/${waba}/message_templates`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(c),
    });
    const j = await r.json();
    if (!r.ok) console.log(`${c.name} [${c.language}] REFUSÉ À LA SOUMISSION : ${j.error?.error_user_msg ?? j.error?.message ?? r.status}`);
    else console.log(`${c.name} [${c.language}] soumis, ${j.status ?? "PENDING"} (id ${j.id})`);
  }
  console.log("\nL'examen prend de quelques minutes à deux jours. « --etat » dit où il en est.");
}

/* Le cliquet importe ce fichier pour son lecteur : la ligne de commande ne
   s'exécute donc que lancée à la main, sinon la suite de tests soumettrait. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  if (argv.includes("--etat")) await etat();
  else if (argv.includes("--soumettre")) await soumettre();
  else {
    const i = argv.indexOf("--ecrire");
    const charges = lesSixCharges();
    if (i >= 0) {
      const dir = argv[i + 1];
      if (!dir) throw new Error("--ecrire attend un dossier");
      mkdirSync(dir, { recursive: true });
      for (const c of charges) {
        const f = path.join(dir, `${c.name}.${c.language}.json`);
        writeFileSync(f, `${JSON.stringify(c, null, 2)}\n`, "utf8");
        console.log(`${f} · ${variablesDe(c.components[1].text).length} variable(s)`);
      }
    } else {
      for (const c of charges) console.log(`${JSON.stringify(c, null, 2)}\n`);
    }
  }
}
