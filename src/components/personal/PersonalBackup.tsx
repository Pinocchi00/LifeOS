import { useState } from "react";
import { localDay } from "../../domain/model";
import {
  parsePersonal,
  restorePersonal,
  sectionNames,
  serializePersonal,
  type PersonalData,
  type PersonalSection,
  type PersonalBackup,
} from "../../domain/personal";

export function PersonalBackupForm({
  data,
  change,
  close,
}: {
  data: PersonalData;
  change: (operation: (data: PersonalData) => PersonalData) => Promise<void>;
  close: () => void;
}) {
  const [included, setIncluded] = useState<PersonalSection[]>([]);
  const [selected, setSelected] = useState<PersonalSection[]>([]);
  const [pending, setPending] = useState<PersonalBackup | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  function download() {
    setError("");
    try {
      const raw = serializePersonal(data, included);
      const url = URL.createObjectURL(
        new Blob([raw], { type: "application/json" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `lifeos-vie-${localDay()}-${Date.now()}.json`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Export impossible.");
    }
  }
  return (
    <div className="form personal-backup">
      <p className="personal-hint">
        Les suivis Vie sont séparés de l’organisation. Ils ne sont inclus ni
        dans l’export général, ni dans la recherche générale. Ce fichier
        contient des informations personnelles en clair : choisissez ce que vous
        souhaitez sauvegarder.
      </p>
      <fieldset className="schedule-fields">
        <legend>Rubriques à exporter</legend>
        {(Object.keys(sectionNames) as PersonalSection[]).map((section) => (
          <label className="check-label" key={section}>
            <input
              type="checkbox"
              checked={included.includes(section)}
              onChange={(event) =>
                setIncluded((current) =>
                  event.target.checked
                    ? [...current, section]
                    : current.filter((value) => value !== section),
                )
              }
            />
            {sectionNames[section]}
          </label>
        ))}
      </fieldset>
      <button
        className="button primary"
        onClick={download}
        disabled={!included.length}
      >
        Exporter la sélection Vie
      </button>
      <hr />
      <label>
        Restaurer une sauvegarde Vie
        <input
          type="file"
          accept=".json,application/json"
          onChange={async (event) => {
            setError("");
            setPending(null);
            setSelected([]);
            const file = event.target.files?.[0];
            if (!file) return;
            try {
              if (file.size > 10 * 1024 * 1024) throw new Error();
              const value = parsePersonal(await file.text());
              setPending(value);
              setSelected(Object.keys(value.sections) as PersonalSection[]);
            } catch {
              setError(
                "Fichier Vie invalide ou incompatible (10 Mo maximum). Aucun suivi n’a été modifié.",
              );
            }
            event.target.value = "";
          }}
        />
      </label>
      {pending && (
        <div className="restore-warning">
          <strong>Remplacer les rubriques choisies ?</strong>
          <p>
            Seules les rubriques cochées seront remplacées. Les autres suivis
            Vie et toutes les données d’organisation seront conservés. Exportez
            d’abord les informations actuelles.
          </p>
          {(Object.keys(pending.sections) as PersonalSection[]).map(
            (section) => (
              <label className="check-label" key={section}>
                <input
                  type="checkbox"
                  checked={selected.includes(section)}
                  onChange={(event) =>
                    setSelected((current) =>
                      event.target.checked
                        ? [...current, section]
                        : current.filter((value) => value !== section),
                    )
                  }
                />
                {sectionNames[section]} ·{" "}
                {Object.values(pending.sections[section]!).reduce(
                  (sum, values) => sum + values.length,
                  0,
                )}{" "}
                élément(s)
              </label>
            ),
          )}
          <button
            className="button danger"
            disabled={saving || !selected.length}
            onClick={async () => {
              setSaving(true);
              setError("");
              try {
                await change((previous) =>
                  restorePersonal(previous, pending, selected),
                );
                close();
              } catch {
                setError(
                  "La restauration Vie a échoué. Les données précédentes sont conservées.",
                );
              } finally {
                setSaving(false);
              }
            }}
          >
            Confirmer la restauration Vie
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <p className="muted small">
        Séparation des fichiers et du stockage, sans chiffrement applicatif.
        Effacer les données du navigateur peut effacer les deux espaces. Les
        exports Vie sont indépendants des fichiers LifeOS v1/v2/v3.
      </p>
    </div>
  );
}
