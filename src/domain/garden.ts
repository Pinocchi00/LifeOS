import { briefing, type Data } from "./model";
import { dayAppointments } from "./planning";
export type GardenScope = "day" | "projects" | "assistants";
export type GardenAction =
  "focus" | "task" | "agenda" | "projects" | "assistants";
export function gardenDirection(
  data: Data,
  today: string,
  scope: GardenScope,
  evening: boolean,
) {
  const brief = briefing(data, today);
  const routines = dayAppointments(data, today).filter(
    (item) => item.kind === "routine" && !item.done,
  );
  if (scope === "projects") {
    const active = data.projects.filter(
      (project) => project.status === "active",
    );
    const activeIds = new Set(active.map((project) => project.id));
    const linked = data.tasks.filter(
      (task) => activeIds.has(task.projectId) && task.status === "todo",
    );
    return {
      title: active.length
        ? "Donner forme\nà la suite."
        : data.projects.length
          ? "Retrouver\nvos projets."
          : "Une intention,\nun projet.",
      description: active.length
        ? `${active.length} projet${active.length > 1 ? "s" : ""} en cours. ${linked.length} tâche${linked.length !== 1 ? "s" : ""} ouverte${linked.length !== 1 ? "s" : ""} leur ${linked.length !== 1 ? "sont" : "est"} rattachée${linked.length !== 1 ? "s" : ""}.`
        : data.projects.length
          ? `${data.projects.length} projet${data.projects.length !== 1 ? "s" : ""} conservé${data.projects.length !== 1 ? "s" : ""}. Aucun n’est marqué en cours.`
          : "Créez un projet pour réunir ses tâches et ses missions dans un même espace.",
      label: data.projects.length ? "Retrouver mes projets" : "Créer un projet",
      action: "projects" as GardenAction,
      metric: `${active.length} en cours`,
      taskId: undefined,
    };
  }
  if (scope === "assistants") {
    const open = data.missions.filter((mission) => mission.status !== "done");
    const review = open.filter((mission) => mission.status === "review").length;
    return {
      title: review
        ? "Votre regard\nfait la différence."
        : "Donner un cap.\nGarder le contrôle.",
      description: review
        ? `${review} mission${review > 1 ? "s attendent" : " attend"} votre vérification. Relisez les résultats avant de valider.`
        : open.length
          ? `${open.length} mission${open.length > 1 ? "s sont suivies" : " est suivie"} ici. Les rapports et les statuts restent sous votre contrôle.`
          : "Préparez une mission pour ChatGPT ou Claude, puis conservez les résultats réellement obtenus.",
      label: review
        ? "Vérifier les missions"
        : open.length
          ? "Ouvrir les missions"
          : "Préparer une mission",
      action: "assistants" as GardenAction,
      metric: review
        ? `${review} à vérifier`
        : `${open.length} ouverte${open.length > 1 ? "s" : ""}`,
      taskId: undefined,
    };
  }
  if (evening)
    return {
      title: "Voir le chemin\nparcouru.",
      description: `${brief.completed.length} tâche${brief.completed.length > 1 ? "s terminées" : " terminée"} aujourd’hui. ${data.routineEntries.filter((entry) => entry.day === today).length} réalisation(s) de routine enregistrée(s). Consultez votre agenda pour préparer la suite.`,
      label: "Voir les tâches terminées",
      action: "agenda" as GardenAction,
      metric: `${brief.completed.length} terminée${brief.completed.length > 1 ? "s" : ""}`,
      taskId: undefined,
    };
  const next = brief.priorities[0];
  if (next)
    return {
      title: "Une chose\nà la fois.",
      description: next.title,
      label: "Me concentrer sur cette tâche",
      action: "focus" as GardenAction,
      metric: brief.overdue.length
        ? `${brief.overdue.length} échéance${brief.overdue.length > 1 ? "s" : ""} à revoir`
        : `${brief.priorities.length} priorité${brief.priorities.length > 1 ? "s" : ""}`,
      taskId: next.id,
    };
  const future = data.tasks.some((task) => task.status === "todo");
  if (routines.length)
    return {
      title: "Retrouver\nvotre rythme.",
      description: `${routines.length} routine${routines.length > 1 ? "s" : ""} prévue${routines.length > 1 ? "s" : ""} aujourd’hui. Ouvrez votre programme pour retrouver les horaires et enregistrer vos réalisations.`,
      label: "Ouvrir mon programme",
      action: "agenda" as GardenAction,
      metric: `${routines.length} routine${routines.length > 1 ? "s" : ""} à faire`,
      taskId: undefined,
    };
  return {
    title: "De l’espace\npour l’essentiel.",
    description: future
      ? "Aucune tâche en retard ou prévue aujourd’hui. Votre planning reste disponible pour préparer la suite."
      : "Choisissez un premier pas. Une tâche suffit pour donner une direction à cette journée.",
    label: future ? "Consulter mon planning" : "Choisir ma première tâche",
    action: (future ? "agenda" : "task") as GardenAction,
    metric: future ? "Aujourd’hui est libre" : "À votre rythme",
    taskId: undefined,
  };
}
