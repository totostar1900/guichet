import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * DEUX RÈGLES NE S'APPLIQUENT PAS ICI, ET ON DIT POURQUOI.
 *
 * Une règle qu'on éteint sans raison écrite revient comme une dette : six mois
 * plus tard personne ne sait si c'était un choix ou une fatigue. Les deux
 * dispenses ci-dessous ont été MESURÉES, pas supposées, et elles sont les plus
 * étroites possibles — un motif de fichiers, pas un réglage global.
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    /**
     * LE SOULIGNÉ DIT « JE DOIS LE RECEVOIR ET JE NE M'EN SERS PAS ».
     *
     * Un réducteur de « useActionState » reçoit l'état précédent, une méthode
     * du dépôt mémoire reçoit l'auteur d'un geste qu'elle n'enregistre pas,
     * une déstructuration sert à RETIRER deux champs : dans ces dix endroits
     * le nom souligné est la convention de la maison, et la règle les
     * signalait comme des oublis. Un avertissement qui désigne un choix
     * délibéré apprend au lecteur à ne plus lire les avertissements — c'est
     * ainsi qu'on perd les vrais.
     */
    files: ["**/*.{ts,tsx,mjs,cjs,js,jsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_" },
      ],
    },
  },
  {
    /* UN FICHIER « .cjs » N'A QUE « require ». C'est tout son contrat : trois
       outils de dépouillement en ligne de commande, lancés par « node », hors
       du bundle. Leur interdire « require » serait leur interdire d'exister. */
    files: ["**/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    /**
     * LES GABARITS PDF NE SONT PAS DU HTML, et le remède de la règle y serait
     * un défaut.
     *
     * « react/no-unescaped-entities » demande d'écrire « &apos; » à la place
     * d'une apostrophe. Ces gabarits passent par « @react-pdf/renderer », qui
     * ne décode aucune entité : mesuré le 29 octobre 2026 en rendant les deux
     * formes et en relisant le flux de texte du PDF, « d&apos;après » sort
     * imprimé tel quel, entité comprise. Suivre la règle mettrait donc
     * « &apos; » dans un document réglementaire envoyé à un client.
     */
    files: ["src/lib/documents/pdf/**/*.tsx"],
    rules: { "react/no-unescaped-entities": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
