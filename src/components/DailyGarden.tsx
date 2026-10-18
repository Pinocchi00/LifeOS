import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Layers3, Leaf, Moon, Sun } from "lucide-react";
import {
  gardenDirection,
  type GardenAction,
  type GardenScope,
} from "../domain/garden";
import type { Data } from "../domain/model";

export function GardenStage({
  scope,
  select,
  calm,
}: {
  scope: GardenScope;
  select: (value: GardenScope) => void;
  calm: boolean;
}) {
  const [enabled, setEnabled] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<
    "photo" | "loading" | "ready" | "fallback"
  >("photo");
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const choice = useRef(false);
  const selected = useRef(scope);
  const selectRef = useRef(select);
  selected.current = scope;
  selectRef.current = select;
  const driver = useRef<ReturnType<
    typeof import("../experience/gardenScene").createGarden
  > | null>(null);
  useEffect(() => {
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    if (
      calm ||
      choice.current ||
      !matchMedia("(pointer:fine)").matches ||
      innerWidth < 900 ||
      (navigator.hardwareConcurrency || 2) < 4 ||
      connection?.saveData ||
      connection?.effectiveType === "2g"
    )
      return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const element = stage.current;
    function enter(event: PointerEvent) {
      if (event.pointerType !== "mouse" || choice.current) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!choice.current) setEnabled(true);
      }, 350);
    }
    function leave() {
      clearTimeout(timer);
    }
    element?.addEventListener("pointerenter", enter);
    element?.addEventListener("pointerleave", leave);
    return () => {
      clearTimeout(timer);
      element?.removeEventListener("pointerenter", enter);
      element?.removeEventListener("pointerleave", leave);
    };
  }, [calm]);
  useEffect(() => {
    if (!enabled) {
      setStatus("photo");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    void import("../experience/gardenScene")
      .then((module) => {
        if (cancelled || !host.current) return;
        driver.current = module.createGarden(host.current, {
          scope: selected.current,
          calm,
          select: (value) => selectRef.current(value),
          unavailable: () => {
            if (!cancelled) {
              setStatus("fallback");
              driver.current?.dispose();
              driver.current = null;
            }
          },
        });
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("fallback");
      });
    return () => {
      cancelled = true;
      driver.current?.dispose();
      driver.current = null;
    };
  }, [enabled, calm, attempt]);
  useEffect(() => {
    driver.current?.setScope(scope);
  }, [scope]);
  return (
    <div
      ref={stage}
      className={`zen-art garden-stage ${status === "ready" ? "has-relief" : ""}`}
      data-scene-state={status}
    >
      <img
        src="/art/concrete-garden.jpg"
        alt=""
        width="1024"
        height="1536"
        fetchPriority="high"
      />
      <div className="garden-stage-wash" aria-hidden="true" />
      <div ref={host} className="garden-canvas" />
      <span className="garden-index" aria-hidden="true">
        L / JARDIN DE TRAVAIL
      </span>
      <button
        className="relief-toggle"
        disabled={enabled && status !== "ready" && status !== "fallback"}
        aria-pressed={enabled && status === "ready"}
        onClick={() => {
          choice.current = true;
          if (status === "ready") setEnabled(false);
          else {
            setEnabled(true);
            if (status === "fallback") setAttempt((value) => value + 1);
          }
        }}
      >
        <Layers3 size={15} />
        {enabled && status !== "ready" && status !== "fallback"
          ? "Le jardin prend forme…"
          : enabled && status === "ready"
            ? "Revenir au visuel"
            : status === "fallback"
              ? "Réessayer le relief"
              : "Explorer en 3D"}
      </button>
      <span className="garden-caption">
        {status === "fallback"
          ? "Le jardin reste accessible en image."
          : status === "ready"
            ? calm
              ? "Relief fixe · choisissez une terrasse ci-dessous."
              : matchMedia("(pointer:fine)").matches
                ? "Survolez le jardin. Choisissez une terrasse."
                : "Choisissez une terrasse pour changer de vue."
            : "Béton, lumière et vivant. Un espace pour avancer."}
      </span>
      <div
        className="garden-terrace-labels"
        role="group"
        aria-label="Terrasses du jardin"
      >
        {(
          [
            { id: "day", label: "Journée", number: "01" },
            { id: "projects", label: "Projets", number: "02" },
            { id: "assistants", label: "Assistants", number: "03" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            aria-pressed={scope === item.id}
            aria-controls="garden-action"
            onClick={() => select(item.id)}
          >
            <span aria-hidden="true">{item.number}</span>
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
  calm,
}: {
  data: Data;
  today: string;
  evening: boolean;
  setEvening: (value: boolean) => void;
  act: (action: GardenAction, taskId?: string) => void;
  calm: boolean;
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
              : "Priorité, puis échéance. Vous pouvez toujours choisir une autre tâche."}
        </span>
      </div>
      <GardenStage scope={scope} select={setScope} calm={calm} />
    </section>
  );
}
