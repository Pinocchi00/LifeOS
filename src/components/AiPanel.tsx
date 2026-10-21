import { useEffect, useRef, useState, useCallback } from "react";
import {
  aiModel,
  aiModels,
  aiCountPayload,
  aiInputSchema,
  usd,
  type AiDraft,
  type AiModelId,
} from "../domain/ai";
import type { Data } from "../domain/model";
import { missionAiText, adoptAiDraft } from "../domain/aiMission";
import { readAiStatus, prepareAi, executeAi } from "../platform/ai";
import {
  pairConnector,
  disconnectConnector,
  supportsConnector,
} from "../platform/connector";
import { isAndroid } from "../platform/runtime";
import { NativeConnectorSettings } from "./NativeConnectorSettings";
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
  const [modelId, setModelId] = useState<AiModelId>(
    mission?.assistant === "claude" ? "claude-sonnet-5-5" : "gpt-5.6-terra",
  );
  const model = aiModel(modelId);
  const provider = model.provider;
  const [text, setText] = useState(mission ? missionAiText(mission) : "");
  const [maxOutputTokens, setMax] = useState<256 | 512 | 1024>(512);
  const [nativeServer, setNativeServer] = useState("");
  const nativeServerRef = useRef("");
  const nativeChanged = useCallback((origin: string) => {
    if (nativeServerRef.current === origin) return;
    nativeServerRef.current = origin;
    setNativeServer(origin);
    setStatus(null);
  }, []);
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
        const result = await executeAi(quote.id, controller.signal, modelId);
        if (mounted.current) setDraft(result);
      } else if (kind === "prepare") {
        const parsed = aiInputSchema.safeParse({
          text,
          maxOutputTokens,
          model: modelId,
        });
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
  if (!mission)
    return <p className="form">Cette mission IA n’est plus disponible.</p>;
  return (
    <div className="ai-panel">
      <p className="eyebrow">
        {provider.toUpperCase()} / UN BROUILLON, PUIS VOTRE JUGEMENT
      </p>
      <h3>{mission.title}</h3>
      <p>
        Préparez une demande, relisez exactement ce qui partira, puis autorisez
        l’envoi. Aucun fichier, historique, lien GitHub ou suivi Vie n’est joint
        automatiquement.
      </p>
      <label>
        Modèle pour cette demande
        <select
          value={modelId}
          disabled={!!busy || !!quote || Boolean(draft && !saved)}
          onChange={(event) => {
            setModelId(event.target.value as AiModelId);
            setApproved(false);
            setModified(true);
            dirty(true);
          }}
        >
          {aiModels
            .filter((item) => item.assistant === mission.assistant)
            .map((item) => (
              <option key={item.model} value={item.model}>
                {item.name} · {item.purpose}
              </option>
            ))}
        </select>
      </label>
      <details className="ai-catalog">
        <summary>{model.name} · tarifs et confidentialité</summary>
        <p>
          Catalogue vérifié le {model.checkedOn}, utilisable jusqu’au{" "}
          {model.validUntil}. Tarif standard : {model.inputUsdPerMillion} USD
          par million de jetons en entrée et {model.outputUsdPerMillion} USD en
          sortie. L’estimation de précaution applique{" "}
          {model.precautionInputUsdPerMillion} USD par million en entrée.
          Montants en USD, hors taxes et évolution des prix. La limite de 20 000
          jetons d’entrée garde Haiku sous son palier de 100 000 jetons.
        </p>
        <a href={model.source} target="_blank" rel="noopener noreferrer">
          Modèle et tarifs officiels
        </a>
        <p>
          Le texte sera transmis à {provider} pour comptage puis génération,
          seulement après confirmation.{" "}
          {provider === "OpenAI"
            ? "Conservation de réponse désactivée avec store: false ; les journaux peuvent être conservés jusqu’à 30 jours selon le compte."
            : "La politique API prévoit une suppression sous 30 jours, avec exceptions contractuelles, de sécurité ou légales ; aucun paramètre de cette demande ne garantit une rétention nulle."}{" "}
          Ne transmettez pas de secret ou de donnée sensible.
        </p>
        <a href={model.privacySource} target="_blank" rel="noopener noreferrer">
          Politique de données {provider}
        </a>
      </details>
      <NativeConnectorSettings
        disabled={!!busy || !!quote || Boolean(draft && !saved)}
        paired={Boolean(status?.paired)}
        changed={nativeChanged}
      />
      {!supportsConnector() ? (
        <p className="ai-notice">
          L’API IA s’utilise dans LifeOS ouvert à l’adresse du serveur, en HTTPS
          ou sur son ordinateur en boucle locale. Cette installation conserve la
          préparation manuelle des instructions. Aucune clé à saisir dans
          l’application.
        </p>
      ) : (
        <>
          <section className="ai-access" aria-label="Accès IA">
            <p className="small muted">
              Serveur contacté :{" "}
              <strong>
                {isAndroid()
                  ? nativeServer || "aucune adresse enregistrée"
                  : window.location.origin}
              </strong>
              . Ouvrir cette adresse ne transfère pas les données d’un autre
              appareil.
            </p>
            <button
              className="button secondary"
              disabled={!!busy || (isAndroid() && !nativeServer)}
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
            {status && !status.providers[provider] && (
              <p>
                Accès {provider} désactivé. Configurez la clé et les limites
                côté serveur avec <code>npm run connector:ai-setup</code>. Guide
                : docs/API-IA.md.
              </p>
            )}
            {status?.providers[provider] && !status.paired && (
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
                !status.providers[provider] ||
                !status.catalogFresh ||
                !text.trim() ||
                (Boolean(draft) && !saved)
              }
              onClick={() => void action("prepare")}
            >
              Préparer l’aperçu sans envoyer à {provider}
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
                    Le texte et les consignes seront transmis à {provider}, avec{" "}
                    {model.name}. Le fournisseur peut les conserver selon sa
                    politique de données ci-dessus ; cet envoi ne garantit pas
                    une rétention nulle.
                  </p>
                  <p>
                    Cet aperçu expire à{" "}
                    {new Date(quote.expiresAt).toLocaleTimeString("fr-FR")}.
                    Enveloppe de précaution :{" "}
                    <strong>{usd(model.reserveNanoUsd)}</strong> par essai,
                    conservée dans la limite quotidienne même après erreur ou
                    annulation. Ce n’est pas le prix facturé. Le comptage
                    précède la génération et peut la bloquer.
                  </p>
                  <details>
                    <summary>Requête exacte préparée pour {provider}</summary>
                    <pre>{JSON.stringify(quote.payload, null, 2)}</pre>
                  </details>
                  <details>
                    <summary>Requête de comptage avant génération</summary>
                    <pre>
                      {JSON.stringify(
                        aiCountPayload({
                          text,
                          maxOutputTokens,
                          model: modelId,
                        }),
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                  <p className="small">
                    Le serveur contacte{" "}
                    {provider === "OpenAI"
                      ? "api.openai.com : /v1/responses/input_tokens puis /v1/responses"
                      : "api.anthropic.com : /v1/messages/count_tokens puis /v1/messages"}
                    . Aucun outil, fichier ou accès Web n’est activé. Une
                    réponse peut être incomplète.
                  </p>
                  {!attempted && (
                    <label className="ai-consent">
                      <input
                        type="checkbox"
                        checked={approved}
                        disabled={!!busy}
                        onChange={(event) => setApproved(event.target.checked)}
                      />
                      J’autorise la transmission à {provider} et une enveloppe
                      de 0,10 USD pour cet essai.
                    </label>
                  )}
                  {!attempted && (
                    <button
                      className="button primary"
                      disabled={!!busy || !approved}
                      onClick={() => void action("send")}
                    >
                      Autoriser et envoyer à {provider}
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
