import type { Data } from "./model";
import {
  adviceSnapshotSchema,
  preferencesSchema,
  samePreferences,
  type AdviceSnapshot,
  type Preferences,
  type Revision,
} from "./adaptationSchema";

export function changePreferences(
  data: Data,
  value: Preferences,
  reason: string,
  restoredFromId = "",
): Data {
  const preferences = preferencesSchema.parse(value);
  if (samePreferences(preferences, data.adaptation.preferences))
    throw new Error("Ces réglages sont déjà appliqués.");
  const explanation = reason.trim();
  if (!explanation || explanation.length > 1000)
    throw new Error("Décrivez ce changement en 1 à 1 000 caractères.");
  if (
    restoredFromId &&
    !data.adaptation.revisions.some((item) => item.id === restoredFromId)
  )
    throw new Error("Cette version n’existe plus.");
  const createdAt = new Date().toISOString();
  const revisions = [...data.adaptation.revisions];
  if (!revisions.length)
    revisions.push({
      id: crypto.randomUUID(),
      createdAt,
      reason:
        "Configuration de départ, conservée avant votre premier changement.",
      preferences: data.adaptation.preferences,
      restoredFromId: "",
    });
  if (revisions.length >= 500)
    throw new Error(
      "Historique plein. Exportez vos données, puis effacez les anciennes versions pour continuer.",
    );
  const revision: Revision = {
    id: crypto.randomUUID(),
    createdAt,
    reason: explanation,
    preferences,
    restoredFromId,
  };
  return {
    ...data,
    adaptation: {
      ...data.adaptation,
      preferences,
      revisions: [...revisions, revision],
      activeRevisionId: revision.id,
    },
  };
}
export function restorePreferences(data: Data, id: string): Data {
  const revision = data.adaptation.revisions.find((item) => item.id === id);
  if (!revision) throw new Error("Cette version n’existe plus.");
  return changePreferences(
    data,
    revision.preferences,
    `Restauration : ${revision.reason}`.slice(0, 1000),
    id,
  );
}
export function clearRevisions(data: Data): Data {
  const revision: Revision = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    reason: "Point de départ après effacement de l’historique.",
    preferences: data.adaptation.preferences,
    restoredFromId: "",
  };
  return {
    ...data,
    adaptation: {
      ...data.adaptation,
      revisions: [revision],
      activeRevisionId: revision.id,
    },
  };
}
export type Advice = AdviceSnapshot & {
  action: "agenda" | "missions" | "learning" | "task";
};
export function adviceCandidates(data: Data, today: string): Advice[] {
  const result: Advice[] = [];
  const add = (
    ruleId: Advice["ruleId"],
    title: string,
    body: string,
    reason: string,
    evidence: string[],
    action: Advice["action"],
  ) =>
    result.push({
      ruleId,
      ruleVersion: 1,
      day: today,
      title,
      body,
      reason,
      evidence,
      action,
    });
  const open = data.tasks.filter((task) => task.status === "todo");
  const overdue = open.filter((task) => task.due && task.due < today);
  if (overdue.length)
    add(
      "overdue",
      "Revoir ce qui reste ouvert.",
      `${overdue.length} ${overdue.length === 1 ? "tâche a dépassé son échéance" : "tâches ont dépassé leur échéance"}. Choisissez ce qui mérite une nouvelle date.`,
      "Échéance antérieure à aujourd’hui et tâche non terminée. Le créneau réservé n’est pas une échéance.",
      [`Date locale : ${today}`, `Tâches en retard : ${overdue.length}`],
      "agenda",
    );
  const review = data.missions.filter((mission) => mission.status === "review");
  if (review.length)
    add(
      "review",
      "Votre regard est attendu.",
      `${review.length} ${review.length === 1 ? "mission attend" : "missions attendent"} votre vérification. Relisez les résultats avant de valider.`,
      "Seul le statut « À vérifier » saisi dans vos missions est compté. Aucun résultat d’assistant n’est évalué automatiquement.",
      [`Missions à vérifier : ${review.length}`],
      "missions",
    );
  const planned = open.filter(
    (task) => task.due === today || task.schedule?.day === today,
  );
  const count = data.adaptation.preferences.priorityCount;
  if (planned.length > count)
    add(
      "load",
      "Choisir une journée tenable.",
      `${planned.length} tâches sont prévues ou arrivent à échéance aujourd’hui, pour ${count} ${count === 1 ? "priorité affichée" : "priorités affichées"}. Revoyez ce qui peut attendre.`,
      "Comparaison avec le nombre de priorités que vous avez choisi. Ce seuil ne mesure ni votre capacité ni la durée réelle des tâches.",
      [
        `Tâches du jour, sans doublon : ${planned.length}`,
        `Priorités choisies : ${count}`,
      ],
      "agenda",
    );
  const unscheduled = open.filter(
    (task) => !task.schedule && (!task.due || task.due <= today),
  );
  if (unscheduled.length)
    add(
      "reserve",
      "Donner une place à une tâche.",
      `${unscheduled.length} ${unscheduled.length === 1 ? "tâche disponible n’a" : "tâches disponibles n’ont"} pas de créneau. Réservez un moment si cela vous aide.`,
      "Tâche ouverte sans créneau, avec une échéance passée/du jour ou sans échéance. Aucun temps de travail n’est déduit.",
      [`Tâches disponibles sans créneau : ${unscheduled.length}`],
      "agenda",
    );
  const learning = data.learningPaths.filter(
    (path) => !path.paused && path.steps.some((step) => !step.completedAt),
  );
  if (learning.length)
    add(
      "learning",
      "Reprendre un fil d’apprentissage.",
      `${learning.length} ${learning.length === 1 ? "parcours actif a" : "parcours actifs ont"} encore une étape ouverte. Ouvrez celui que vous souhaitez poursuivre.`,
      "Parcours non en pause avec au moins une étape non cochée. Aucune maîtrise ou durée d’étude n’est estimée.",
      [`Parcours actifs à poursuivre : ${learning.length}`],
      "learning",
    );
  if (!open.length && !review.length && !learning.length)
    add(
      "start",
      "Laisser une place au prochain pas.",
      "Aucune tâche ouverte, mission à vérifier ou étape d’apprentissage active à proposer. Vous pouvez choisir un premier pas ou garder cet espace libre.",
      "Absence de tâches ouvertes, de missions à vérifier et de parcours actifs incomplets. Vos suivis Vie ne sont pas consultés.",
      [
        "Tâches ouvertes : 0",
        "Missions à vérifier : 0",
        "Parcours actifs incomplets : 0",
      ],
      "task",
    );
  return result;
}
export function currentAdvice(data: Data, today: string): Advice | null {
  const { preferences, feedback } = data.adaptation;
  if (!preferences.suggestions) return null;
  return (
    adviceCandidates(data, today).find(
      (item) =>
        !preferences.mutedRules.includes(item.ruleId) &&
        !feedback.some(
          (entry) =>
            entry.ruleId === item.ruleId &&
            entry.day === today &&
            entry.choice === "later" &&
            !entry.withdrawnAt,
        ),
    ) ?? null
  );
}
export function recordFeedback(
  data: Data,
  advice: Advice,
  choice: "useful" | "later",
  today: string,
): Data {
  const current = currentAdvice(data, today);
  if (!current || JSON.stringify(current) !== JSON.stringify(advice))
    throw new Error(
      "Ce conseil a changé. Relisez la proposition actuelle avant de répondre.",
    );
  if (
    data.adaptation.feedback.some(
      (item) =>
        item.ruleId === advice.ruleId &&
        item.day === today &&
        !item.withdrawnAt,
    )
  )
    throw new Error(
      "Un retour est déjà enregistré pour ce conseil aujourd’hui. Vous pouvez l’annuler dans vos repères.",
    );
  if (data.adaptation.feedback.length >= 5000)
    throw new Error(
      "Historique des retours plein. Exportez-le puis effacez les anciens retours pour continuer.",
    );
  const { action: _action, ...snapshot } = advice;
  const entry = {
    ...adviceSnapshotSchema.parse(snapshot),
    id: crypto.randomUUID(),
    choice,
    createdAt: new Date().toISOString(),
    withdrawnAt: null,
  };
  return {
    ...data,
    adaptation: {
      ...data.adaptation,
      feedback: [...data.adaptation.feedback, entry],
    },
  };
}
export function withdrawFeedback(data: Data, id: string): Data {
  return {
    ...data,
    adaptation: {
      ...data.adaptation,
      feedback: data.adaptation.feedback.map((item) =>
        item.id === id && !item.withdrawnAt
          ? { ...item, withdrawnAt: new Date().toISOString() }
          : item,
      ),
    },
  };
}
