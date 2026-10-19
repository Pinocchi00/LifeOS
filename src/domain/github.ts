import type { Data } from "./model";
import {
  githubCheckSchema,
  githubKey,
  parseGithubUrl,
  type GithubCheck,
} from "./githubSchema";
export function addGithubLink(
  data: Data,
  missionId: string,
  url: string,
): Data {
  if (!data.missions.some((mission) => mission.id === missionId))
    throw new Error("Cette mission n’existe plus.");
  const target = parseGithubUrl(url);
  const links = data.githubLinks.filter((link) => link.missionId === missionId);
  if (links.some((link) => githubKey(link.target) === githubKey(target)))
    throw new Error("Ce lien est déjà relié à cette mission.");
  if (links.length >= 10 || data.githubLinks.length >= 2000)
    throw new Error(
      "Limite de liens atteinte (10 par mission, 2 000 au total). Retirez un ancien lien pour continuer.",
    );
  return {
    ...data,
    githubLinks: [
      ...data.githubLinks,
      {
        id: crypto.randomUUID(),
        missionId,
        target,
        createdAt: new Date().toISOString(),
        checks: [],
      },
    ],
  };
}
export function appendGithubCheck(
  data: Data,
  linkId: string,
  check: GithubCheck,
): Data {
  const value = githubCheckSchema.parse(check);
  const link = data.githubLinks.find((item) => item.id === linkId);
  if (!link)
    throw new Error("Ce lien n’existe plus. Le relevé n’a pas été conservé.");
  if (link.target.kind !== value.kind)
    throw new Error("Le relevé ne correspond pas à ce type de lien.");
  if (link.checks.length >= 20)
    throw new Error(
      "20 relevés conservés. Exportez l’organisation puis effacez les anciens relevés pour reprendre les lectures.",
    );
  return {
    ...data,
    githubLinks: data.githubLinks.map((item) =>
      item.id === linkId ? { ...item, checks: [...item.checks, value] } : item,
    ),
  };
}
export function removeGithubLink(data: Data, id: string): Data {
  return {
    ...data,
    githubLinks: data.githubLinks.filter((item) => item.id !== id),
  };
}
export function clearGithubChecks(data: Data, id: string): Data {
  return {
    ...data,
    githubLinks: data.githubLinks.map((item) =>
      item.id === id ? { ...item, checks: item.checks.slice(-1) } : item,
    ),
  };
}
export function removeMission(data: Data, id: string): Data {
  return {
    ...data,
    missions: data.missions.filter((item) => item.id !== id),
    githubLinks: data.githubLinks.filter((item) => item.missionId !== id),
  };
}
export function githubCheckLabel(check: GithubCheck): string {
  if (check.kind === "issue")
    return check.state === "open" ? "Issue ouverte" : "Issue fermée";
  if (check.kind === "pull")
    return check.merged
      ? "Pull request fusionnée"
      : check.state === "closed"
        ? "Pull request fermée, non fusionnée"
        : check.draft
          ? "Pull request en brouillon"
          : "Pull request ouverte";
  const statuses: Record<string, string> = {
    queued: "En attente",
    in_progress: "En cours",
    completed: "Terminée",
    waiting: "En attente",
    requested: "Demandée",
    pending: "En attente",
  };
  const conclusions: Record<string, string> = {
    success: "Réussite",
    failure: "Échec",
    cancelled: "Annulée",
    timed_out: "Délai dépassé",
    neutral: "Neutre",
    skipped: "Ignorée",
    action_required: "Action requise",
    stale: "Obsolète",
    startup_failure: "Échec au démarrage",
  };
  return check.status === "completed"
    ? check.conclusion
      ? (conclusions[check.conclusion] ??
        `Conclusion non reconnue : ${check.conclusion}`)
      : "Terminée, conclusion absente"
    : (statuses[check.status] ?? `État non reconnu : ${check.status}`);
}
