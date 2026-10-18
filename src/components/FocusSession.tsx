import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, FilePenLine } from "lucide-react";
import { briefing, priorityNames, type Data, type Task } from "../domain/model";
export function FocusSession({
  data,
  today,
  taskId,
  complete,
  edit,
  close,
  undo,
}: {
  data: Data;
  today: string;
  taskId?: string;
  complete: (task: Task) => Promise<void>;
  edit: (task: Task) => void;
  close: () => void;
  undo?: { taskId: string; run: () => Promise<void> };
}) {
  const [selected, setSelected] = useState(taskId);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const queue = briefing(data, today).priorities;
  const task = queue.find((item) => item.id === selected) ?? queue[0];
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      heading.current?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(frame);
  }, [task?.id]);
  const undoButton = undo ? (
    <button
      disabled={saving}
      className="text-button focus-undo"
      onClick={async () => {
        const restore = undo;
        setSaving(true);
        try {
          await restore.run();
          setSelected(restore.taskId);
          setNotice("Tâche rouverte.");
        } catch {
          setNotice("La tâche n’a pas pu être rouverte. Réessayez.");
        } finally {
          setSaving(false);
        }
      }}
    >
      Rouvrir la dernière tâche
    </button>
  ) : null;
  if (!task)
    return (
      <div className="focus-session focus-finished">
        <Check size={35} />
        <h3 ref={heading} tabIndex={-1}>
          Vos priorités sont à jour.
        </h3>
        <p>
          Vous pouvez revenir à l’accueil ou préparer la suite dans l’agenda.
        </p>
        <button className="button primary" onClick={close}>
          Revenir à l’accueil
          <ArrowRight size={16} />
        </button>
        {undoButton}
      </div>
    );
  const project = data.projects.find((item) => item.id === task.projectId);
  return (
    <div className="focus-session">
      <div className="focus-meta">
        <span>{project?.name ?? "Sans projet"}</span>
        <span>Priorité {priorityNames[task.priority].toLowerCase()}</span>
      </div>
      <h3 ref={heading} tabIndex={-1}>
        {task.title}
      </h3>
      {task.description ? (
        <p className="focus-description">{task.description}</p>
      ) : (
        <p className="focus-description muted">
          Commencez par la première action concrète. Vous pouvez ajouter un
          détail si cette tâche mérite d’être précisée.
        </p>
      )}
      <span className="focus-due">
        {task.due
          ? `Échéance : ${new Date(task.due + "T12:00:00").toLocaleDateString("fr-FR")}${task.due < today ? " · à replanifier si nécessaire" : ""}`
          : "Aucune échéance fixée."}
      </span>
      <div className="focus-actions">
        <button
          disabled={saving}
          className="button primary"
          onClick={async () => {
            setSaving(true);
            try {
              await complete(task);
              setNotice("Tâche terminée. La suivante est prête.");
            } catch {
              setNotice(
                "La tâche reste ouverte. Réessayez quand le stockage est disponible.",
              );
            } finally {
              setSaving(false);
            }
          }}
        >
          <Check size={17} />
          {saving ? "Enregistrement…" : "Terminer cette tâche"}
        </button>
        <button className="text-button" onClick={() => edit(task)}>
          <FilePenLine size={15} />
          Préciser ou replanifier
        </button>
      </div>
      {notice && (
        <p className="small" role="status">
          {notice}
        </p>
      )}
      {undoButton}
      {queue.length > 1 && (
        <div className="focus-queue">
          <span className="small muted">Changer de priorité</span>
          {queue
            .filter((item) => item.id !== task.id)
            .map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setSelected(item.id);
                  setNotice("");
                }}
              >
                {item.title}
                <ArrowRight size={14} />
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
