import { useEffect, useRef, useState, useCallback } from "react";
import { LockKeyhole } from "lucide-react";
import {
  connectorStatus,
  pairConnector,
  disconnectConnector,
  supportsConnector,
  type ConnectorStatus,
} from "../platform/connector";
import { isAndroid } from "../platform/runtime";
import { NativeConnectorSettings } from "./NativeConnectorSettings";
export type GithubAccessMode = "public" | "server";
export function GithubAccess({
  mode,
  ready,
  disabled,
  select,
  setReady,
}: {
  mode: GithubAccessMode;
  ready: boolean;
  disabled: boolean;
  select: (value: GithubAccessMode) => void;
  setReady: (value: boolean) => void;
}) {
  const [nativeServer, setNativeServer] = useState("");
  const nativeServerRef = useRef("");
  const nativeChanged = useCallback(
    (origin: string) => {
      if (nativeServerRef.current === origin) return;
      nativeServerRef.current = origin;
      setNativeServer(origin);
      setStatus(null);
      setReady(false);
    },
    [setReady],
  );
  const [status, setStatus] = useState<ConnectorStatus | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
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
  async function act(kind: "status" | "pair" | "logout") {
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    try {
      if (kind === "logout") {
        await disconnectConnector(controller.signal);
        if (mounted.current) {
          setStatus(null);
          setReady(false);
        }
      } else {
        const result =
          kind === "pair"
            ? await pairConnector(code.trim(), controller.signal)
            : await connectorStatus(controller.signal);
        if (mounted.current) {
          setStatus(result);
          setReady(result.paired && result.githubConfigured);
        }
      }
    } catch (error) {
      if (mounted.current) {
        setReady(false);
        setStatus(null);
        setError(
          error instanceof Error ? error.message : "Appairage impossible.",
        );
      }
    } finally {
      if (mounted.current) {
        setCode("");
        setBusy(false);
      }
      request.current = null;
    }
  }
  return (
    <section className="github-access" aria-label="Accès GitHub">
      <div className="github-access-heading">
        <LockKeyhole size={18} />
        <h3>Choisir le chemin de lecture</h3>
      </div>
      <div
        className="github-access-modes"
        role="group"
        aria-label="Mode de lecture GitHub"
      >
        <button
          className={`button ${mode === "public" ? "primary" : "secondary"}`}
          aria-pressed={mode === "public"}
          disabled={disabled || busy}
          onClick={() => select("public")}
        >
          Public, sans compte
        </button>
        <button
          className={`button ${mode === "server" ? "primary" : "secondary"}`}
          aria-pressed={mode === "server"}
          disabled={disabled || busy}
          onClick={() => select("server")}
        >
          Privé, par mon serveur
        </button>
      </div>
      {mode === "server" && (
        <>
          <p>
            Lisez les dépôts autorisés de votre serveur LifeOS. Votre jeton
            GitHub reste côté serveur ; l’application ne le reçoit pas.
          </p>
          <p className="small">
            Les titres et liens privés rejoindront votre sauvegarde
            d’organisation en clair. La déconnexion conservera ces relevés hors
            ligne.
          </p>
          <NativeConnectorSettings
            disabled={disabled || busy}
            paired={Boolean(status?.paired)}
            changed={nativeChanged}
          />
          {!supportsConnector() ? (
            <p className="github-network-note">
              Accès privé disponible dans LifeOS ouvert à l’adresse du serveur,
              en HTTPS ou en boucle locale sur son ordinateur. Cette
              installation conserve l’accès public.
            </p>
          ) : (
            <>
              <p className="small muted">
                Serveur contacté :{" "}
                <strong>
                  {isAndroid()
                    ? nativeServer || "aucune adresse enregistrée"
                    : window.location.origin}
                </strong>
                . L’appairage ne transfère pas vos données locales.
              </p>
              <div className="github-actions">
                <button
                  className="button secondary"
                  disabled={disabled || busy || (isAndroid() && !nativeServer)}
                  onClick={() => void act("status")}
                >
                  {busy
                    ? "Contact du serveur…"
                    : isAndroid() || window.location.protocol === "https:"
                      ? "Vérifier ce serveur HTTPS"
                      : "Vérifier le serveur local"}
                </button>
                {ready && (
                  <button
                    className="text-button"
                    disabled={disabled || busy}
                    onClick={() => void act("logout")}
                  >
                    Déconnecter le serveur
                  </button>
                )}
              </div>
              {status && !status.githubConfigured && (
                <p role="status">
                  Serveur trouvé. Configurez le jeton et les dépôts autorisés
                  côté serveur, puis redémarrez-le.
                </p>
              )}
              {status?.githubConfigured && !ready && (
                <div className="github-pair">
                  <label>
                    Code d’appairage du terminal
                    <input
                      type="password"
                      autoComplete="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      maxLength={64}
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          code.trim() &&
                          !busy &&
                          !disabled
                        ) {
                          event.preventDefault();
                          void act("pair");
                        }
                      }}
                    />
                  </label>
                  <button
                    className="button primary"
                    disabled={disabled || busy || !code.trim()}
                    onClick={() => void act("pair")}
                  >
                    {isAndroid()
                      ? "Appairer cet appareil au serveur"
                      : "Appairer ce navigateur au serveur"}
                  </button>
                  <p className="small muted">
                    Le code du terminal est à usage unique et valable dix
                    minutes. Ce n’est pas votre jeton GitHub. Redémarrez le
                    serveur pour obtenir un nouveau code si nécessaire.
                  </p>
                </div>
              )}
              {ready && status?.expiresAt && (
                <p className="github-session" role="status">
                  Session appairée jusqu’au{" "}
                  {new Date(status.expiresAt).toLocaleString("fr-FR")}. Aucun
                  dépôt n’a été lu par cet appairage.
                </p>
              )}
            </>
          )}
          <details>
            <summary>Configurer mon serveur LifeOS</summary>
            <p className="small">
              Après compilation du projet, lancez{" "}
              <code>npm run connector:setup</code>
              sous Windows. Il demande les dépôts autorisés puis le jeton en
              saisie masquée. Ouvrez l’adresse affichée dans son terminal.
            </p>
            <p className="small">
              Changer d’adresse ou de port change le stockage : exportez
              l’organisation et Vie séparément avant de les restaurer à la
              nouvelle adresse. Guide complet :{" "}
              <code>docs/SERVEUR-LOCAL.md</code>.
            </p>
            <p className="small muted">
              Node.js 24.12 minimum. Le mode local écoute sur 127.0.0.1 ; le
              mode distant exige une origine HTTPS et un certificat valide.
              Guide : docs/SERVEUR-HTTPS.md. La session est partagée par les
              onglets de cette adresse et expire après une heure. Redémarrez le
              serveur pour un nouveau code après expiration ou déconnexion. Les
              instructions copiées incluent les adresses des références ; aucune
              mission ni donnée Vie n’est envoyée.
            </p>
          </details>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
