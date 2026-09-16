import { DeskNav } from "@/components/DeskNav";
import { botAvailable } from "@/lib/bot/reply";
import { repo } from "@/lib/data";
import { BotBench } from "./BotBench";

export const dynamic = "force-dynamic";
export const metadata = { title: "Robot WhatsApp" };

export default async function RobotPage() {
  const contacts = (await repo().listContacts()).filter((c) => c.phone);
  return (
    <>
      <DeskNav current="/desk/robot" />
      <div className="panel">
        <div className="panel-h">
          <h2>Robot WhatsApp — banc d&apos;essai</h2>
          <span className="muted" style={{ fontSize: ".8rem" }}>
            {botAvailable() ? "Actif : les messages entrants reçoivent une réponse automatique" : "Inactif — ajoutez ANTHROPIC_API_KEY pour l'activer"}
          </span>
        </div>
        <BotBench contacts={contacts.map((c) => ({ name: c.name, phone: c.phone! }))} />
      </div>
      <div className="panel">
        <div className="panel-h">
          <h2>Ce qu&apos;il fait, ce qu&apos;il ne fait pas</h2>
        </div>
        <div style={{ padding: "12px 16px", fontSize: ".85rem", color: "var(--ink-2)", maxWidth: "80ch" }}>
          <p>
            <b>Seul :</b> définitions (rendement actuariel, coupon couru, in fine, adjudication…), caractéristiques exactes des offres publiées, chiffrage d&apos;un montant, dates, état des intentions et documents du client, ouverture de compte, enregistrement d&apos;un appétit, d&apos;une question ou d&apos;un rappel. STOP / START gèrent l&apos;opt-in.
          </p>
          <p>
            <b>Jamais :</b> conseiller une ligne, promettre une allocation ou un rendement, parler d&apos;un autre client, inventer un chiffre, traiter une réclamation. Prise ferme et cession = appétit enregistré + rappel d&apos;un conseiller (événement dans le flux du desk).
          </p>
          <p>Chaque échange est journalisé (message entrant, réponse, intention créée). Le robot ne répond qu&apos;aux messages entrants : hors fenêtre de 24 h, seuls les modèles approuvés partent.</p>
        </div>
      </div>
    </>
  );
}
