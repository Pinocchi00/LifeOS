import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { aiCatalog } from "../src/domain/ai.ts";
export class AiBudget {
  constructor(path, config) {
    if (path !== ":memory:")
      mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.config = config;
    this.db = new DatabaseSync(path, { timeout: 1000, defensive: true });
    const version = this.db.prepare("PRAGMA user_version").get().user_version;
    if (version !== 0 && version !== 1) {
      this.db.close();
      throw new Error(
        "Version du registre IA incompatible. Aucun compteur réinitialisé.",
      );
    }
    this.db.exec(
      "PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS ai_attempts (id TEXT PRIMARY KEY, day TEXT NOT NULL, reserved INTEGER NOT NULL, state TEXT NOT NULL) STRICT; PRAGMA user_version=1;",
    );
  }
  summary(time) {
    const day = new Date(time).toISOString().slice(0, 10);
    const row = this.db
      .prepare(
        "SELECT COUNT(*) AS attempts, COALESCE(SUM(reserved),0) AS reserved FROM ai_attempts WHERE day=?",
      )
      .get(day);
    return {
      day,
      attempts: row.attempts,
      reservedNanoUsd: row.reserved,
      dailyNanoUsd: this.config.dailyNanoUsd,
      dailyCalls: this.config.dailyCalls,
    };
  }
  reserve(id, time) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      if (this.db.prepare("SELECT id FROM ai_attempts WHERE id=?").get(id))
        throw new Error(
          "Cet envoi a déjà été tenté. Aucun nouvel appel effectué.",
        );
      const count = this.db
        .prepare(
          "SELECT COUNT(*) AS total, MAX(day) AS lastDay FROM ai_attempts",
        )
        .get();
      const current = this.summary(time);
      if (
        count.total >= 10000 ||
        (count.lastDay && current.day < count.lastDay)
      )
        throw new Error(
          "Registre plein ou horloge revenue en arrière. Vérifiez le serveur.",
        );
      if (
        current.attempts >= current.dailyCalls ||
        current.reservedNanoUsd + aiCatalog.reserveNanoUsd >
          current.dailyNanoUsd
      )
        throw new Error(
          "Limite quotidienne IA atteinte. Aucun envoi au fournisseur.",
        );
      this.db
        .prepare("INSERT INTO ai_attempts VALUES (?, ?, ?, 'reserved')")
        .run(id, current.day, aiCatalog.reserveNanoUsd);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  finish(id, state) {
    this.db.prepare("UPDATE ai_attempts SET state=? WHERE id=?").run(state, id);
  }
  close() {
    this.db.close();
  }
}
