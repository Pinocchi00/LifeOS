import { useBackupImport } from "../../storage/useBackupImport";
import { useEffect, useState } from "react";
import { localDay } from "../../domain/model";
import { exportJson } from "../../platform/backup";
import { isAndroid } from "../../platform/runtime";
import {
  parsePersonal,
  restorePersonal,
  sectionNames,
  serializePersonal,
  type PersonalData,
  type PersonalSection,
} from "../../domain/personal";

export function PersonalBackupForm({
  data,
  change,
  close,
  writing,
}: {
  data: PersonalData;
  change: (operation: (data: PersonalData) => PersonalData) => Promise<void>;
  close: () => void;
  writing: boolean;
}) {
  const [included, setIncluded] = useState<PersonalSection[]>([]);
  const [selected, setSelected] = useState<PersonalSection[]>([]);
  const imported = useBackupImport(
    parsePersonal,
    "Fichier Vie invalide ou incompatible (10 Mo maximum). Aucun suivi n’a été modifié.",
  );
  const { pending, reading } = imported;
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  useEffect(() => {
    setSelected(
      pending ? (Object.keys(pending.sections) as PersonalSection[]) : [],
    );
  }, [pending]);
  async function download() {
    setError("");
    imported.clearError();
    setExporting(true);
    try {
      const raw = serializePersonal(data, included);
      await exportJson(raw, `lifeos-vie-${localDay()}-${Date.now()}.json`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Export impossible.");
    } finally {
      setExporting(false);
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
      {writing && (
        <p role="status">
          Enregistrement Vie en cours. La sauvegarde sera disponible après les
          dernières écritures.
        </p>
      )}
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
        onClick={() => void download()}
        disabled={!included.length || exporting || saving || reading || writing}
      >
        Exporter la sélection Vie
      </button>
      {isAndroid() && (
        <p className="small muted">
          Choisissez où conserver le JSON dans le partage Android. Fermer le
          partage ne garantit pas qu’une copie a été enregistrée.
        </p>
      )}
      <hr />
      <label>
        Restaurer une sauvegarde Vie
        <input
          type="file"
          accept=".json,application/json"
          disabled={saving || exporting || writing}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (!file) return;
            setError("");
            setSelected([]);
            void imported.load(file);
          }}
        />
      </label>
      {reading && <p role="status">Lecture de la sauvegarde Vie…</p>}
      {(reading || pending) && (
        <button
          className="button secondary backup-cancel"
          disabled={saving || exporting || writing}
          onClick={() => {
            imported.cancel();
            setSelected([]);
            setError("");
          }}
        >
          Annuler la restauration Vie
        </button>
      )}
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
            disabled={
              saving || exporting || reading || writing || !selected.length
            }
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
      {(error || imported.error) && (
        <p role="alert" className="error">
          {error || imported.error}
        </p>
      )}
      <p className="muted small">
        Séparation des fichiers et du stockage, sans chiffrement applicatif.
        Effacer les données du navigateur peut effacer les deux espaces. Les
        exports Vie sont indépendants des fichiers LifeOS v1 à v7.
      </p>
    </div>
  );
}
