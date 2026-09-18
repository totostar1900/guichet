// Runs the dev server on the in-memory seed (no Supabase, dev login, no MFA):
// what a reviewer or the guide screenshots need. `npm run dev:memory`.
import { spawn } from "node:child_process";
const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "", SUPABASE_SERVICE_ROLE_KEY: "", DESK_MFA: "off", PORT: process.env.PORT ?? "3000" };
const child = spawn(process.platform === "win32" ? "npx.cmd" : "npx", ["next", "dev", "-p", env.PORT], { stdio: "inherit", env, shell: process.platform === "win32" });
child.on("exit", (code) => process.exit(code ?? 0));
