import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RACINE } from "./racine";

/**
 * LES CAPTURES DU GUIDE SONT PRISES SUR UNE PAGE VIVANTE.
 *
 * LE PIÈGE, mesuré le 25 octobre 2026, et il est silencieux de bout en bout.
 * Next refuse les ressources `/_next/*` demandées depuis une origine qu'il
 * n'autorise pas, et il n'autorise que `localhost` par défaut. Le seul
 * `/_next/*` qui porte un en-tête `Origin` est le WEBSOCKET HMR : ouvert
 * depuis `127.0.0.1`, il reçoit un « Unauthorized » écrit à cru sur la socket,
 * le navigateur n'y voit pas une réponse HTTP valide, et **la page ne s'hydrate
 * jamais**.
 *
 * CE QUE CELA DONNE À L'ÉCRAN : rien. Le HTML du serveur s'affiche, les
 * feuilles de style s'appliquent, les mesures de géométrie sont exactes. Seuls
 * les GESTES ne répondent pas — un bouton reste désactivé, un panneau ne
 * s'ouvre pas, un voile ne se ferme pas. Relevé : zéro nœud hydraté par
 * `127.0.0.1`, cent trente-cinq par `localhost`, sur la même page au même
 * moment. Une seule ligne le signale, dans le journal du serveur.
 *
 * POURQUOI UNE ÉPREUVE POUR SI PEU : « guide:shots » écrit QUARANTE-TROIS
 * fichiers dans `public/guide/`, et ils sont commités. Pris sur une page non
 * hydratée, ils montreraient l'application figée — panneaux fermés, états
 * initiaux — sans que rien, ni dans la capture ni dans le dépôt, ne dise
 * pourquoi. C'est exactement la forme de défaut que cette maison garde :
 * le silence est indistinguable du fonctionnement normal.
 */
const SCRIPTS = path.join(RACINE, "scripts");

/* L'adresse de l'APPLICATION. Celle du protocole DevTools de Chrome n'est pas
   concernée : elle ne passe pas par Next, et elle DOIT rester une IP. */
const ADRESSE_APP = /(?:BASE|baseUrl|APP_URL)\s*(?:\?\?|=|:)\s*"(http:\/\/[^"]+)"/g;

const scripts = (): string[] =>
  fs
    .readdirSync(SCRIPTS, { withFileTypes: true })
    .filter((e) => e.isFile() && (e.name.endsWith(".mjs") || e.name.endsWith(".js")))
    .map((e) => path.join(SCRIPTS, e.name));

describe("un script qui pilote l'application dans un navigateur", () => {
  it("l'ouvre par « localhost », jamais par une adresse IP", () => {
    const fautifs: string[] = [];
    let adresses = 0;
    for (const f of scripts()) {
      const src = fs.readFileSync(f, "utf8");
      for (const m of src.matchAll(ADRESSE_APP)) {
        adresses += 1;
        const hote = new URL(m[1]).hostname;
        if (hote !== "localhost") fautifs.push(`${path.relative(RACINE, f).replace(/\\/g, "/")} · ${m[1]}`);
      }
    }
    expect(
      fautifs,
      "le serveur de développement ouvert par une IP ne s'hydrate pas : la capture montrerait l'application figée, sans rien pour le dire",
    ).toEqual([]);
    /* NON VACUITÉ : sans adresse trouvée, l'épreuve passerait au vert en
       n'ayant rien regardé — et c'est précisément le défaut qu'elle garde. */
    expect(adresses, "plus aucune adresse d'application dans « scripts/ » : le motif ne reconnaît plus rien").toBeGreaterThan(0);
  });

  /* ET LA RAISON RESTE ÉCRITE OÙ ON LA CHERCHE : dans le README, à l'endroit
     où l'on démarre le serveur. Une épreuve qui garde une règle sans que la
     règle soit lisible quelque part oblige à lire l'épreuve pour comprendre
     l'erreur. */
  it("et le README dit pourquoi, là où l'on démarre le serveur", () => {
    const readme = fs.readFileSync(path.join(RACINE, "README.md"), "utf8");
    expect(readme, "le README ne met plus en garde contre 127.0.0.1 : l'épreuve voisine devient une règle sans raison").toMatch(/127\.0\.0\.1/);
    expect(readme, "la raison a disparu du README : c'est l'hydratation qui est en cause, pas le style").toMatch(/hydrat/i);
  });
});
