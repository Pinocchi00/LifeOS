import { useEffect, useRef, useState } from "react";
import { aiCatalog, aiInputSchema, usd, type AiDraft } from "../domain/ai";
import type { Data } from "../domain/model";
import { missionAiText, adoptAiDraft } from "../domain/aiMission";
import { readAiStatus, prepareAi, executeAi } from "../platform/ai";
import {
  pairConnector,
  disconnectConnector,
  supportsConnector,
} from "../platform/connector";
export function AiPanel({
  data,
  missionId,
  change,
  dirty,
}: {
  data: Data;
  missionId: string;
  change: (operation: (previous: Data) => Data) => Promise<void>;
  dirty: (value: boolean) => void;
}) {
  const mission = data.missions.find((item) => item.id === missionId);
  const [text, setText] = useState(mission ? missionAiText(mission) : "");
  const [maxOutputTokens, setMax] = useState<256 | 512 | 1024>(512);
  const [status, setStatus] = useState<Awaited<
    ReturnType<typeof readAiStatus>
  > | null>(null);
  const [quote, setQuote] = useState<Awaited<
    ReturnType<typeof prepareAi>
  > | null>(null);
  const [draft, setDraft] = useState<AiDraft | null>(null);
  const [code, setCode] = useState("");
  const [approved, setApproved] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [modified, setModified] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current?.abort();
    };
  }, []);
  async function action(
    kind: "status" | "pair" | "prepare" | "send" | "save" | "logout",
  ) {
    const controller = new AbortController();
    request.current = controller;
    setBusy(kind);
    setError("");
    try {
      if (kind === "save" && draft) {
        await change((previous) => adoptAiDraft(previous, missionId, draft));
        if (mounted.current) {
          setSaved(true);
          setModified(false);
          dirty(false);
        }
        return;
      }
      if (kind === "logout") {
        await disconnectConnector(controller.signal);
        if (mounted.current) {
          setQuote(null);
          setApproved(false);
          dirty(Boolean(draft && !saved) || modified);
        }
      } else if (kind === "send") {
        if (!quote || !approved || attempted) return;
        setAttempted(true);
        dirty(true);
        const result = await executeAi(quote.id, controller.signal);
        if (mounted.current) setDraft(result);
      } else if (kind === "prepare") {
        const parsed = aiInputSchema.safeParse({ text, maxOutputTokens });
        if (!parsed.success)
          throw new Error(
            "Gardez une demande de 1 à 6 000 caractères et une limite de sortie proposée.",
          );
        const input = parsed.data;
        const result = await prepareAi(input, controller.signal);
        if (mounted.current) {
          setQuote(result);
          setApproved(false);
          setAttempted(false);
          setDraft(null);
          setSaved(false);
          dirty(true);
        }
      } else if (kind === "pair")
        await pairConnector(code.trim(), controller.signal);
      if (mounted.current) setStatus(await readAiStatus(controller.signal));
    } catch (error) {
      if (kind === "send" && !controller.signal.aborted) {
        try {
          const current = await readAiStatus(controller.signal);
          if (mounted.current) setStatus(current);
        } catch {
          /* Keep the draft and the original failure. */
        }
      }
      if (mounted.current)
        setError(
          error instanceof Error && error.message.length < 350
            ? error.message
            : "Opération IA impossible ou réponse incompatible. Aucun réessai automatique.",
        );
    } finally {
      if (mounted.current) {
        setBusy("");
        setCode("");
      }
      request.current = null;
    }
  }
  if (!mission || mission.assistant !== "chatgpt")
    return <p className="form">Cette mission OpenAI n’est plus disponible.</p>;
  return (
    <div className="ai-panel">
      <p className="eyebrow">OPENAI / UN BROUILLON, PUIS VOTRE JUGEMENT</p>
      <h3>{mission.title}</h3>
      <p>
        Préparez une demande, relisez exactement ce qui partira, puis autorisez
        l’envoi. Aucun fichier, historique, lien GitHub ou suivi Vie n’est joint
        automatiquement.
      </p>
      <details className="ai-catalog">
        <summary>{aiCatalog.name} · tarifs et confidentialité</summary>
        <p>
          Catalogue vérifié le {aiCatalog.checkedOn}, utilisable jusqu’au{" "}
          {aiCatalog.validUntil}. Tarif standard :{" "}
          {aiCatalog.inputUsdPerMillion} USD par million de jetons en entrée et{" "}
          {aiCatalog.outputUsdPerMillion} USD en sortie. Les écritures de cache
          peuvent majorer l’entrée : l’estimation applique 2,50 USD par million.
          Montants en USD, hors taxes et évolution des prix.
        </p>
        <a href={aiCatalog.source} target="_blank" rel="noopener noreferrer">
          Modèle et tarifs officiels
        </a>
        <p>
          Le texte sera transmis à OpenAI pour comptage puis génération,
          seulement après confirmation. Conservation de réponse désactivée avec
          store: false ; cela ne garantit pas une absence de rétention chez le
          fournisseur. Les journaux de surveillance peuvent être conservés
          jusqu’à 30 jours selon le compte. Ne transmettez pas de secret ou de
          donnée sensible.
        </p>
        <a
          href={aiCatalog.privacySource}
          target="_blank"
          rel="noopener noreferrer"
        >
          Politique de données OpenAI
        </a>
      </details>
      {!supportsConnector() ? (
        <p className="ai-notice">
          L’API IA s’utilise dans le navigateur de l’ordinateur qui exécute le
          serveur local. Android conserve la préparation manuelle des
          instructions. Aucune clé à saisir dans l’application.
        </p>
      ) : (
        <>
          <section className="ai-access" aria-label="Accès IA">
            <button
              className="button secondary"
              disabled={!!busy}
              onClick={() => void action("status")}
            >
              Vérifier l’accès IA du serveur
            </button>
            {status?.paired && (
              <>
                <button
                  className="text-button"
                  disabled={!!busy}
                  onClick={() => void action("logout")}
                >
                  Déconnecter le serveur
                </button>
                <p className="small muted">
                  Session commune à l’IA et GitHub : ce bouton déconnecte les
                  deux accès. Les brouillons et relevés conservés restent
                  disponibles.
                </p>
              </>
            )}
            {status && !status.configured && (
              <p>
                Accès IA désactivé. Configurez la clé et les limites côté
                serveur avec <code>npm run connector:ai-setup</code>. Guide :
                docs/API-IA.md.
              </p>
            )}
            {status?.configured && !status.paired && (
              <div className="ai-pair">
                <label>
                  Code d’appairage du terminal
                  <input
                    type="password"
                    autoComplete="off"
                    maxLength={64}
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                  />
                </label>
                <button
                  className="button secondary"
                  disabled={!!busy || !code.trim()}
                  onClick={() => void action("pair")}
                >
                  Appairer l’accès IA
                </button>
              </div>
            )}
            {status?.budget && (
              <p role="status">
                Jour UTC {status.budget.day} : {status.budget.attempts} /{" "}
                {status.budget.dailyCalls} essais ;{" "}
                {usd(status.budget.reservedNanoUsd)} /{" "}
                {usd(status.budget.dailyNanoUsd)} d’enveloppes réservées.
              </p>
            )}
            {status && !status.catalogFresh && (
              <p className="error">
                Catalogue périmé ou horloge incorrecte. Les envois sont bloqués
                jusqu’à sa vérification côté projet.
              </p>
            )}
          </section>
          <label>
            Texte à transmettre
            <textarea
              rows={9}
              maxLength={6000}
              value={text}
              disabled={!!busy || !!quote}
              onChange={(event) => {
                setText(event.target.value);
                setModified(true);
                dirty(true);
              }}
            />
          </label>
          <p className="small muted">
            {text.length} / 6 000 caractères. Les noms de fichiers et les
            rapports existants ne sont pas repris.
          </p>
          <label>
            Limite de sortie, raisonnement compris
            <select
              value={maxOutputTokens}
              disabled={!!busy || !!quote}
              onChange={(event) => {
                setMax(Number(event.target.value) as 256 | 512 | 1024);
                setModified(true);
                dirty(true);
              }}
            >
              <option value={256}>256 jetons · bref</option>
              <option value={512}>512 jetons · standard</option>
              <option value={1024}>1 024 jetons · développé</option>
            </select>
          </label>
          {!quote && (
            <button
              className="button primary"
              disabled={
                !!busy ||
                !status?.paired ||
                !status.configured ||
                !status.catalogFresh ||
                !text.trim() ||
                (Boolean(draft) && !saved)
              }
              onClick={() => void action("prepare")}
            >
              Préparer l’aperçu sans envoyer à OpenAI
            </button>
          )}
          {quote && (
            <section
              className="ai-approval"
              aria-label="Autorisation de l’envoi IA"
            >
              {attempted ? (
                <>
                  <p className="small">
                    Un essai a été demandé. Aucun nouvel envoi n’aura lieu
                    automatiquement.
                  </p>
                  <details>
                    <summary>Revoir la requête de cet essai</summary>
                    <pre>{JSON.stringify(quote.payload, null, 2)}</pre>
                  </details>
                </>
              ) : (
                <>
                  <h3>Relire, puis autoriser</h3>
                  <p>
                    Le texte et les consignes quitteront LifeOS. OpenAI peut
                    conserver des journaux jusqu’à 30 jours selon les contrôles
                    du compte ; les détails figurent dans la politique de
                    données ci-dessus.
                  </p>
                  <p>
                    Cet aperçu expire à{" "}
                    {new Date(quote.expiresAt).toLocaleTimeString("fr-FR")}.
                    Enveloppe de précaution :{" "}
                    <strong>{usd(aiCatalog.reserveNanoUsd)}</strong> par essai,
                    conservée dans la limite quotidienne même après erreur ou
                    annulation. Ce n’est pas le prix facturé. Le comptage
                    précède la génération et peut la bloquer.
                  </p>
                  <details>
                    <summary>Requête exacte préparée pour OpenAI</summary>
                    <pre>{JSON.stringify(quote.payload, null, 2)}</pre>
                  </details>
                  <p className="small">
                    Le serveur envoie d’abord le modèle, les consignes et le
                    texte à /responses/input_tokens, puis cette requête à
                    /responses. Aucun outil, fichier ou accès Web n’est activé.
                    Une réponse peut être incomplète.
                  </p>
                  {!attempted && (
                    <label className="ai-consent">
                      <input
                        type="checkbox"
                        checked={approved}
                        disabled={!!busy}
                        onChange={(event) => setApproved(event.target.checked)}
                      />
                      J’autorise la transmission à OpenAI et une enveloppe de
                      0,10 USD pour cet essai.
                    </label>
                  )}
                  {!attempted && (
                    <button
                      className="button primary"
                      disabled={!!busy || !approved}
                      onClick={() => void action("send")}
                    >
                      Autoriser et envoyer à OpenAI
                    </button>
                  )}
                </>
              )}
              {!busy && !draft && (
                <button
                  className="text-button"
                  onClick={() => {
                    setQuote(null);
                    setApproved(false);
                  }}
                >
                  Revenir au texte, sans réessai
                </button>
              )}
            </section>
          )}
        </>
      )}
      {busy && (
        <p role="status">
          {busy === "send"
            ? "Demande en cours… Fermer ou annuler peut interrompre l’attente sans annuler la facturation."
            : "Opération en cours…"}
        </p>
      )}
      {busy && busy !== "save" && (
        <button
          className="text-button"
          onClick={() => request.current?.abort()}
        >
          Annuler l’attente
        </button>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {draft && (
        <section className="ai-draft" aria-label="Brouillon reçu">
          <h3>
            {draft.refusal
              ? "Le modèle a refusé"
              : "Une proposition à examiner"}
          </h3>
          {draft.status === "incomplete" && (
            <p className="ai-notice">
              Réponse incomplète. Elle peut s’arrêter avant sa conclusion.
            </p>
          )}
          <p className="small">
            {draft.model} · {draft.inputTokens} jetons d’entrée,{" "}
            {draft.outputTokens} de sortie déclarés. Estimation de précaution{" "}
            {usd(draft.estimatedNanoUsd)}, hors taxes et variations tarifaires ;
            enveloppe de {usd(draft.reservedNanoUsd)} conservée.
          </p>
          <pre>{draft.text}</pre>
          {!saved ? (
            <button
              className="button primary"
              disabled={!!busy}
              onClick={() => void action("save")}
            >
              Conserver comme compte-rendu non vérifié
            </button>
          ) : (
            <p role="status">
              Brouillon conservé dans la mission et ses sauvegardes. Le statut
              et la validation n’ont pas changé.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
