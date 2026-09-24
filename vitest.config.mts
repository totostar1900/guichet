import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(here, "src"),
      // Next's marker import; a no-op under vitest.
      "server-only": path.resolve(here, "src/test/server-only.ts"),
    },
  },
  // Generous timeouts: the e2e tests render PDFs and run next to a dev server
  // on the same machine. Le plafond est là pour attraper un blocage, pas une
  // lenteur : les deux plus lourds (actes, revue KYC) prennent six secondes
  // seuls, et la suite entière lance un processus par fichier. Passé une
  // quarantaine de fichiers sur une machine chargée, chacun n'a plus qu'une
  // fraction du processeur et six secondes en deviennent trente, sans que rien
  // ne soit cassé. Le plafond suit donc la suite plutôt que l'inverse.
  // Un processus par fichier, mais pas cinquante à la fois : la suite porte
  // des cas qui lisent de vrais PDF et en prennent quarante secondes à eux
  // seuls. Lancés tous ensemble, chacun n'a qu'une fraction du processeur, et
  // ils dépassent le plafond sans que rien ne soit cassé. Moitié des cœurs :
  // la suite finit plus vite qu'en se disputant la machine.
  test: { include: ["src/**/*.test.ts", "src/**/*.test.tsx"], testTimeout: 90_000, hookTimeout: 90_000, maxWorkers: "50%" },
});
