import { useState } from "react";
import { ArrowRight, Settings2, Sprout } from "lucide-react";
import type { Data } from "../domain/model";
import { currentAdvice, type Advice } from "../domain/adaptation";
import { ruleNames } from "../domain/adaptationSchema";

export function AdviceCard({
  data,
  today,
  react,
  act,
  settings,
}: {
  data: Data;
  today: string;
  react: (advice: Advice, choice: "useful" | "later") => Promise<void>;
  act: (action: Advice["action"]) => void;
  settings: () => void;
}) {
  const advice = currentAdvice(data, today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const feedback =
    advice &&
    data.adaptation.feedback.find(
      (item) =>
        item.ruleId === advice.ruleId &&
        item.day === today &&
        !item.withdrawnAt,
    );
  async function respond(choice: "useful" | "later") {
    if (!advice) return;
    setBusy(true);
    setError("");
    try {
      await react(advice, choice);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Retour non enregistré. Réessayez.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="insight-card adaptation-advice"
      aria-label="Conseil local"
    >
      <div className="eyebrow">
        <span />
        UN PEU DE RECUL
      </div>
      <Sprout size={25} />
      <h2>{advice?.title ?? "Garder votre propre rythme."}</h2>
      <p>
        {advice?.body ??
          (data.adaptation.preferences.suggestions
            ? "Aucun conseil disponible avec vos réglages et vos retours du jour. Vos tâches et vos projets restent accessibles."
            : "Les conseils sont masqués par votre choix. Vous pouvez les réactiver dans vos réglages.")}
      </p>
      {advice && (
        <>
          <details>
            <summary>Pourquoi ce conseil ?</summary>
            <p>{advice.reason}</p>
            <ul>
              {advice.evidence.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="small">
              Règle locale : {ruleNames[advice.ruleId]} · version{" "}
              {advice.ruleVersion}. Sources : organisation enregistrée sur cet
              appareil. Les suivis Vie ne sont pas consultés.
            </p>
            <p className="small">
              Affichage : {data.adaptation.preferences.priorityCount}{" "}
              {data.adaptation.preferences.priorityCount === 1
                ? "priorité"
                : "priorités"}
              ,{" "}
              {data.adaptation.preferences.taskOrder === "priority"
                ? "priorité puis échéance"
                : "échéance puis priorité"}
              . Ordre des conseils : retards, missions, charge du jour,
              créneaux, apprentissage, premier pas ; seuls les cas présents et
              autorisés sont retenus.
            </p>
          </details>
          <button className="text-button" onClick={() => act(advice.action)}>
            {advice.action === "agenda"
              ? "Revoir mon agenda"
              : advice.action === "missions"
                ? "Vérifier les missions"
                : advice.action === "learning"
                  ? "Ouvrir mes parcours"
                  : "Choisir un premier pas"}
            <ArrowRight size={15} />
          </button>
          {feedback ? (
            <p role="status" className="small">
              Retour utile enregistré pour aujourd’hui. L’instantané d’origine
              reste dans vos repères ; annulez ce retour pour répondre à
              nouveau.
            </p>
          ) : (
            <div className="advice-reactions">
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => void respond("useful")}
              >
                Utile
              </button>
              <button
                className="text-button"
                disabled={busy}
                onClick={() => void respond("later")}
              >
                Pas aujourd’hui
              </button>
            </div>
          )}
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="text-button advice-settings" onClick={settings}>
        <Settings2 size={15} />
        Mes réglages et retours
      </button>
    </section>
  );
}
