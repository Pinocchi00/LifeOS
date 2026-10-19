import { useMemo, useState } from "react";
import { ArrowRight, Leaf, Moon, Sun } from "lucide-react";
import {
  gardenDirection,
  type GardenAction,
  type GardenScope,
} from "../domain/garden";
import type { Data } from "../domain/model";

function GardenStage({
  scope,
  select,
}: {
  scope: GardenScope;
  select: (scope: GardenScope) => void;
}) {
  return (
    <div className="zen-art garden-stage">
      <img
        src="/art/concrete-garden.jpg"
        alt=""
        width="1024"
        height="1536"
        fetchPriority="high"
      />
      <div className="garden-stage-wash" aria-hidden="true" />
      <span className="garden-index" aria-hidden="true">
        L / JARDIN DE TRAVAIL
      </span>
      <span className="garden-caption">
        Choisissez un espace pour trouver votre prochaine action.
      </span>
      <div
        className="garden-terrace-labels"
        role="group"
        aria-label="Espaces du jardin"
      >
        {(
          [
            { id: "day", label: "Journée" },
            { id: "projects", label: "Projets" },
            { id: "assistants", label: "Assistants" },
          ] as const
        ).map((item, index) => (
          <button
            key={item.id}
            aria-pressed={scope === item.id}
            aria-controls="garden-action"
            onClick={() => select(item.id)}
          >
            <span aria-hidden="true">0{index + 1}</span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DailyGarden({
  data,
  today,
  evening,
  setEvening,
  act,
}: {
  data: Data;
  today: string;
  evening: boolean;
  setEvening: (value: boolean) => void;
  act: (action: GardenAction, taskId?: string) => void;
}) {
  const [scope, setScope] = useState<GardenScope>("day");
  const direction = useMemo(
    () => gardenDirection(data, today, scope, evening),
    [data, today, scope, evening],
  );
  return (
    <section
      className="briefing-card daily-garden"
      aria-label="Briefing quotidien"
    >
      <div
        className="briefing-text garden-direction"
        role="region"
        aria-label="Votre prochaine action"
        id="garden-action"
      >
        <span className="sr-only" role="status">
          {scope === "day"
            ? "Journée"
            : scope === "projects"
              ? "Projets"
              : "Assistants"}{" "}
          : {direction.metric}. {direction.label}.
        </span>
        <div className="briefing-kicker">
          <Leaf size={16} />
          <span>
            {scope === "day"
              ? "VOTRE JOURNÉE"
              : scope === "projects"
                ? "VOS PROJETS"
                : "VOS ASSISTANTS"}
          </span>
        </div>
        {scope === "day" && (
          <div
            className="segmented"
            role="group"
            aria-label="Moment du briefing"
          >
            <button
              aria-pressed={!evening}
              className={!evening ? "selected" : ""}
              onClick={() => setEvening(false)}
            >
              <Sun size={12} />
              Le matin
            </button>
            <button
              aria-pressed={evening}
              className={evening ? "selected" : ""}
              onClick={() => setEvening(true)}
            >
              <Moon size={12} />
              Le soir
            </button>
          </div>
        )}
        <div className="direction-content" key={`${scope}-${evening}`}>
          <span className="direction-metric">{direction.metric}</span>
          <h2>{direction.title}</h2>
          <p className={direction.action === "focus" ? "next-task-name" : ""}>
            {direction.description}
          </p>
          <button
            className="button light"
            onClick={() => act(direction.action, direction.taskId)}
          >
            {direction.label}
            <ArrowRight size={17} />
          </button>
        </div>
        <span className="briefing-source">
          {scope === "assistants"
            ? "Missions saisies dans LifeOS. Vous gardez la validation."
            : scope === "projects"
              ? "Projets et tâches enregistrés sur cet appareil."
              : `${data.adaptation.preferences.taskOrder === "priority" ? "Priorité, puis échéance" : "Échéance, puis priorité"}. Vous pouvez toujours choisir une autre tâche.`}
        </span>
      </div>
      <GardenStage scope={scope} select={setScope} />
    </section>
  );
}
