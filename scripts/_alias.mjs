import { register } from "node:module";

/**
 * À charger avant un script qui importe le domaine :
 *
 *   node --experimental-strip-types --import ./scripts/_alias.mjs scripts/mon-script.mjs
 *
 * Il enregistre le crochet qui résout « @/ », et rien d'autre : un script qui
 * n'en a pas besoin ne le charge pas.
 */
register("./_alias-hook.mjs", import.meta.url);
