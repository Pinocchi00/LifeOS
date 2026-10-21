import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
export function Modal({
  title,
  children,
  close,
  pending = false,
  pendingMessage = "Un brouillon ou un envoi IA reste en cours. Fermer peut perdre la réponse et n’annule pas forcément sa facturation.",
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  pending?: boolean;
  pendingMessage?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [dirty, setDirty] = useState(false);
  const dirtyNow = useRef(false);
  const [discard, setDiscard] = useState(false);
  const backdropDown = useRef(false);
  const lastControl = useRef<HTMLElement | null>(null);
  function requestClose() {
    if (dirtyNow.current || pending) setDiscard(true);
    else close();
  }
  useLayoutEffect(() => {
    dirtyNow.current = false;
    setDirty(false);
    setDiscard(false);
  }, [title]);
  useEffect(() => {
    if (!dirty && !pending) return;
    const protect = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [dirty, pending]);
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
        if ((event.target as HTMLElement).closest("form [data-dirties]")) {
          dirtyNow.current = true;
          setDirty(true);
        }
      }}
      onChangeCapture={(event) => {
        if ((event.target as HTMLElement).closest("form")) {
          dirtyNow.current = true;
          setDirty(true);
        }
      }}
      onInputCapture={(event) => {
        if ((event.target as HTMLElement).closest("form")) {
          dirtyNow.current = true;
          setDirty(true);
        }
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
            {pending
              ? pendingMessage
              : "Le formulaire n’est pas enregistré. Vous pouvez continuer ou quitter sans enregistrer."}
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
