import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
export function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [dirty, setDirty] = useState(false);
  const [discard, setDiscard] = useState(false);
  const backdropDown = useRef(false);
  const lastControl = useRef<HTMLElement | null>(null);
  function requestClose() {
    if (dirty) setDiscard(true);
    else close();
  }
  useEffect(() => {
    setDirty(false);
    setDiscard(false);
  }, [title]);
  useEffect(() => {
    if (!dirty) return;
    const protect = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [dirty]);
  useEffect(() => {
    ref.current?.showModal();
    ref.current
      ?.querySelector<HTMLElement>(
        '[data-dialog-initial],form input:not([type="checkbox"]),.search-input input',
      )
      ?.focus({ preventScroll: true });
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="modal-title"
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClickCapture={(event) => {
        if ((event.target as HTMLElement).closest("form [data-dirties]"))
          setDirty(true);
      }}
      onChangeCapture={(event) => {
        if ((event.target as HTMLElement).closest("form")) setDirty(true);
      }}
      onFocusCapture={(event) => {
        if ((event.target as HTMLElement).matches("input,textarea,select"))
          lastControl.current = event.target as HTMLElement;
      }}
      onPointerDown={(event) => {
        backdropDown.current = event.target === ref.current;
      }}
      onClick={(event) => {
        if (event.target === ref.current && backdropDown.current)
          requestClose();
      }}
    >
      <div className="modal-head">
        <h2 id="modal-title">{title}</h2>
        <button
          className="icon-button"
          aria-label="Fermer"
          onClick={requestClose}
        >
          <X size={20} />
        </button>
      </div>
      {discard && (
        <div className="unsaved-prompt" role="alert">
          <strong>Garder vos modifications ?</strong>
          <p>
            Le formulaire n’est pas enregistré. Vous pouvez continuer ou quitter
            sans enregistrer.
          </p>
          <div>
            <button
              autoFocus
              className="button primary"
              onClick={() => {
                setDiscard(false);
                lastControl.current?.focus();
              }}
            >
              Continuer la modification
            </button>
            <button className="button danger" onClick={close}>
              Quitter sans enregistrer
            </button>
          </div>
        </div>
      )}
      {children}
    </dialog>
  );
}
