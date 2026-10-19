import { useEffect, useRef, useState, type FormEvent } from "react";
import { ExternalLink, GitPullRequest, Plus } from "lucide-react";
import type { Data } from "../domain/model";
import {
  clearGithubChecks,
  githubCheckLabel,
  removeGithubLink,
} from "../domain/github";
import {
  githubUrl,
  parseGithubUrl,
  type GithubCheck,
  type GithubLink,
} from "../domain/githubSchema";
import { readGithub } from "../platform/github";
import { appendGithubCheck } from "../domain/github";
const date = (value: string) =>
  new Date(value).toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
export function GithubLinkForm({
  save,
  close,
}: {
  save: (url: string) => Promise<void>;
  close: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const url = String(new FormData(event.currentTarget).get("url"));
    setError("");
    try {
      parseGithubUrl(url);
    } catch (error) {
      setError((error as Error).message);
      return;
    }
    setBusy(true);
    try {
      await save(url);
      close();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Lien non enregistré. Votre saisie est conservée.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form" onSubmit={submit}>
      <p className="muted">
        Reliez une issue, une pull request ou une exécution GitHub Actions.
        Ajouter ce lien le conserve sur cet appareil, sans contacter GitHub.
      </p>
      <label>
        Lien GitHub public
        <input
          autoFocus
          type="url"
          name="url"
          required
          maxLength={500}
          placeholder="https://github.com/auteur/depot/pull/123"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
      </label>
      <p className="small muted">
        La lecture publique se lance ensuite sur demande. Aucun jeton ni compte
        à saisir ici. Les dépôts privés et GitHub Enterprise nécessiteront un
        connecteur sécurisé distinct.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button
          type="button"
          disabled={busy}
          className="button secondary"
          onClick={close}
        >
          Annuler
        </button>
        <button className="button primary" disabled={busy}>
          Relier ce lien
        </button>
      </div>
    </form>
  );
}
function CheckDetails({ value }: { value: GithubCheck }) {
  return (
    <>
      <strong className="github-state">{githubCheckLabel(value)}</strong>
      <p>{value.title}</p>
      <p className="small muted">
        Lu le {date(value.checkedAt)} · mise à jour déclarée par GitHub :{" "}
        {date(value.remoteUpdatedAt)}.
      </p>
      {value.kind !== "issue" && (
        <p className="github-commit">
          Commit : <code>{value.headSha}</code>
        </p>
      )}
      {value.kind === "run" && (
        <p className="small">
          Tentative {value.attempt}. Ce résultat décrit cette seule exécution,
          pas tous les contrôles du dépôt.
        </p>
      )}
    </>
  );
}
export function GithubPanel({
  data,
  missionId,
  add,
  change,
}: {
  data: Data;
  missionId: string;
  add: () => void;
  change: (operation: (previous: Data) => Data) => Promise<void>;
}) {
  const mission = data.missions.find((item) => item.id === missionId);
  const links = data.githubLinks.filter((link) => link.missionId === missionId);
  const [busy, setBusy] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState<{
    kind: "remove" | "history";
    id: string;
  } | null>(null);
  const request = useRef<AbortController | null>(null);
  const confirmationRef = useRef<HTMLElement>(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    const node = confirmationRef.current;
    if (confirm && node) {
      const header = node.closest("dialog")?.querySelector(".modal-head");
      node.style.scrollMarginTop = `${(header?.getBoundingClientRect().height ?? 0) + 16}px`;
      node.scrollIntoView({ block: "start", behavior: "instant" });
      node.focus({ preventScroll: true });
    }
  }, [confirm]);
  async function check(link: GithubLink) {
    const controller = new AbortController();
    request.current = controller;
    setBusy(link.id);
    setError("");
    setMessage("");
    try {
      const value = await readGithub(link.target, controller.signal);
      if (controller.signal.aborted) return;
      await change((previous) => appendGithubCheck(previous, link.id, value));
      setMessage("Relevé conservé. Le statut de votre mission n’a pas changé.");
    } catch (error) {
      setError(
        `${link.target.owner}/${link.target.repo} · ${error instanceof Error ? error.message : "Lecture impossible."}`,
      );
    } finally {
      request.current = null;
      setBusy("");
    }
  }
  async function act() {
    if (!confirm) return;
    setSaving(true);
    setError("");
    try {
      await change((previous) =>
        confirm.kind === "remove"
          ? removeGithubLink(previous, confirm.id)
          : clearGithubChecks(previous, confirm.id),
      );
      setMessage(
        confirm.kind === "remove"
          ? "Lien et relevés retirés de LifeOS. Aucune modification sur GitHub."
          : "Anciens relevés effacés. Le dernier est conservé.",
      );
      setConfirm(null);
    } catch {
      setError("La modification n’a pas pu être enregistrée. Réessayez.");
    } finally {
      setSaving(false);
    }
  }
  if (!mission) return <p className="form">Cette mission n’existe plus.</p>;
  return (
    <div className="github-panel">
      <div className="github-intro">
        <GitPullRequest size={26} />
        <p>
          Gardez des références vérifiables pour{" "}
          <strong>{mission.title}</strong>. Chaque lecture est volontaire ; les
          relevés restent consultables hors ligne.
        </p>
      </div>
      <p className="github-network-note">
        « Vérifier et garder un relevé » contacte uniquement l’API publique de
        GitHub avec le dépôt et le numéro du lien. Votre adresse IP est
        transmise ; aucun texte de mission, suivi Vie, cookie ou jeton n’est
        envoyé. Aucun appel au démarrage ni en arrière-plan.
      </p>
      <button
        autoFocus
        className="button primary"
        disabled={!!busy || saving || links.length >= 10}
        onClick={add}
      >
        <Plus size={16} />
        Relier un lien GitHub
      </button>
      <p className="small muted">
        {links.length} lien{links.length > 1 ? "s" : ""} sur 10 pour cette
        mission. Les liens et relevés sont inclus dans la sauvegarde
        d’organisation v6.
      </p>
      {confirm && (
        <section
          className="restore-warning github-confirm"
          ref={confirmationRef}
          tabIndex={-1}
          role="region"
          aria-label="Confirmation GitHub"
        >
          <h3>
            {confirm.kind === "remove"
              ? "Retirer ce lien et ses relevés ?"
              : "Effacer les anciens relevés ?"}
          </h3>
          <p>
            {confirm.kind === "remove"
              ? "Le lien et tous ses relevés seront supprimés de LifeOS. La mission, ses comptes-rendus et la source GitHub seront conservés."
              : "Le dernier relevé restera consultable. Les plus anciens seront supprimés. Exportez d’abord l’organisation pour conserver leur historique."}
          </p>
          <p className="github-url">
            {links.find((link) => link.id === confirm.id) &&
              githubUrl(links.find((link) => link.id === confirm.id)!.target)}
          </p>
          <div className="form-actions">
            <button
              className="button secondary"
              disabled={saving}
              onClick={() => setConfirm(null)}
            >
              Garder les relevés
            </button>
            <button
              className="button danger"
              disabled={saving}
              onClick={() => void act()}
            >
              Confirmer l’effacement GitHub local
            </button>
          </div>
        </section>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {!links.length && (
        <p className="github-empty">
          Aucune référence reliée. Commencez par le lien d’un travail à vérifier
          ou d’un problème à résoudre.
        </p>
      )}
      {links.map((link) => {
        const latest = link.checks.at(-1);
        return (
          <article className="github-link" key={link.id}>
            <p className="eyebrow">
              {link.target.kind === "run"
                ? "Exécution GitHub"
                : link.target.kind === "pull"
                  ? "Pull request"
                  : "Issue"}{" "}
              · {link.target.owner}/{link.target.repo} · #{link.target.number}
            </p>
            {latest ? (
              <CheckDetails value={latest} />
            ) : (
              <p>
                Aucun relevé conservé. Ce lien n’a pas encore été lu par LifeOS.
              </p>
            )}
            <a
              className="text-button"
              href={githubUrl(link.target)}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
            >
              Ouvrir sur GitHub
              <ExternalLink size={14} />
            </a>
            <div className="github-actions">
              <button
                className="button secondary"
                disabled={!!busy || saving || link.checks.length >= 20}
                onClick={() => void check(link)}
              >
                {busy === link.id
                  ? "Lecture de GitHub…"
                  : "Vérifier et garder un relevé"}
              </button>
              {busy === link.id && (
                <button
                  className="text-button"
                  onClick={() => request.current?.abort()}
                >
                  Annuler la lecture
                </button>
              )}
              <button
                className="text-button danger"
                disabled={!!busy || saving}
                onClick={() => {
                  setConfirm({ kind: "remove", id: link.id });
                  setError("");
                  setMessage("");
                }}
              >
                Retirer ce lien
              </button>
            </div>
            {link.checks.length >= 20 && (
              <p className="small">
                20 relevés conservés : exportez l’organisation puis effacez les
                anciens relevés pour reprendre les lectures.
              </p>
            )}
            {link.checks.length > 0 && (
              <details>
                <summary>Historique des relevés · {link.checks.length}</summary>
                {[...link.checks].reverse().map((check) => (
                  <div className="github-history" key={check.id}>
                    <CheckDetails value={check} />
                  </div>
                ))}
                {link.checks.length > 1 && (
                  <button
                    className="text-button danger"
                    disabled={!!busy || saving}
                    onClick={() => {
                      setConfirm({ kind: "history", id: link.id });
                      setError("");
                      setMessage("");
                    }}
                  >
                    Effacer les anciens relevés
                  </button>
                )}
              </details>
            )}
          </article>
        );
      })}
      <p className="small muted">
        Un relevé est un instantané, pas un état en temps réel. Une issue
        fermée, une PR fusionnée ou une exécution réussie ne valide pas vos
        critères : la validation de la mission reste manuelle. Le quota public
        de GitHub est partagé par adresse IP ; une lecture peut être refusée ou
        retardée.
      </p>
    </div>
  );
}
