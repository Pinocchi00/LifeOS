import { useEffect, useState } from "react";
import { isAndroid } from "../platform/runtime";
import {
  configureNativeConnector,
  forgetNativeConnector,
  nativeConnectorInfo,
  type NativeConnectorInfo,
} from "../platform/nativeConnector";

export function NativeConnectorSettings({
  disabled,
  paired,
  changed,
}: {
  disabled: boolean;
  paired: boolean;
  changed: (origin: string) => void;
}) {
  const [info, setInfo] = useState<NativeConnectorInfo>({
    origin: "",
    sessionActive: false,
  });
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!isAndroid()) return;
    let alive = true;
    void nativeConnectorInfo()
      .then((value) => {
        if (alive) {
          setInfo(value);
          setAddress(value.origin);
          changed(value.origin);
        }
      })
      .catch(() => {
        if (alive)
          setError(
            "Réglage du serveur indisponible. Fermez puis rouvrez ce panneau.",
          );
      });
    return () => {
      alive = false;
    };
  }, [paired, changed]);
  if (!isAndroid()) return null;
  async function save(forget: boolean) {
    setBusy(true);
    setError("");
    try {
      const value = await (forget
        ? forgetNativeConnector()
        : configureNativeConnector(address.trim()));
      setInfo(value);
      setAddress(value.origin);
      changed(value.origin);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Réglage non enregistré.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="native-connector-settings"
      aria-label="Serveur HTTPS Android"
    >
      <h3>Votre serveur, sur cet appareil</h3>
      <p className="small muted">
        Seule cette adresse est mémorisée. La session reste en mémoire native ;
        aucune clé fournisseur à saisir ici. Mémoriser une adresse ne contacte
        pas le serveur.
      </p>
      <label>
        Adresse HTTPS du serveur
        <input
          type="url"
          maxLength={2048}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="https://lifeos.exemple.fr"
          value={address}
          disabled={disabled || busy || info.sessionActive || paired}
          onChange={(event) => setAddress(event.target.value)}
        />
      </label>
      <div className="github-actions">
        <button
          className="button secondary"
          disabled={
            disabled ||
            busy ||
            info.sessionActive ||
            paired ||
            !address.trim() ||
            address === info.origin
          }
          onClick={() => void save(false)}
        >
          Mémoriser cette adresse
        </button>
        {info.origin && (
          <button
            className="text-button"
            disabled={disabled || busy}
            onClick={() => void save(true)}
          >
            Oublier cet accès sur l’appareil
          </button>
        )}
      </div>
      {info.origin && (
        <p className="small">
          Adresse enregistrée : <strong>{info.origin}</strong>. Vérifiez ensuite
          l’accès avec le bouton du connecteur. Vos données restent dans l’APK.
        </p>
      )}
      <p className="small muted">
        Déconnectez le serveur avant de changer d’adresse. Oublier retire la
        session de cet appareil ; si la déconnexion distante est impossible,
        elle peut rester valide côté serveur jusqu’à une heure. Vos relevés et
        comptes-rendus sont conservés.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </section>
  );
}
