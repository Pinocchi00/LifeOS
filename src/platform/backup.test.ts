import { beforeEach, expect, it, vi } from "vitest";
import { exportJson } from "./backup";
const mocks = vi.hoisted(() => ({
  readdir: vi.fn(),
  deleteFile: vi.fn(),
  writeFile: vi.fn(),
  share: vi.fn(),
}));
vi.mock("./runtime", () => ({ isAndroid: () => true }));
vi.mock("@capacitor/filesystem", () => ({
  Filesystem: mocks,
  Directory: { Cache: "CACHE" },
  Encoding: { UTF8: "utf8" },
}));
vi.mock("@capacitor/share", () => ({ Share: mocks }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.readdir.mockResolvedValue({ files: [] });
  mocks.writeFile.mockResolvedValue({
    uri: "file:///cache/lifeos-exports/test.json",
  });
  mocks.share.mockResolvedValue({});
});
it("refuse un chemin arbitraire avant tout accès aux fichiers", async () => {
  await expect(exportJson("{}", "../../notes.json")).rejects.toThrow();
  expect(mocks.writeFile).not.toHaveBeenCalled();
});
it("écrit le JSON UTF-8 dans le cache privé et ne partage que son URI", async () => {
  await exportJson(
    '{"application":"LifeOS-Vie"}',
    "lifeos-vie-2026-10-19-1234.json",
  );
  expect(mocks.writeFile).toHaveBeenCalledWith(
    expect.objectContaining({
      directory: "CACHE",
      encoding: "utf8",
      data: '{"application":"LifeOS-Vie"}',
      path: "lifeos-exports/lifeos-vie-2026-10-19-1234.json",
    }),
  );
  expect(mocks.share).toHaveBeenCalledWith(
    expect.objectContaining({
      files: ["file:///cache/lifeos-exports/test.json"],
    }),
  );
  expect(mocks.deleteFile).not.toHaveBeenCalled();
});
it("nettoie seulement les anciens fichiers de son dossier et garde les exports récents", async () => {
  mocks.readdir.mockResolvedValue({
    files: [
      { name: "old.json", type: "file", mtime: 0 },
      { name: "new.json", type: "file", mtime: Date.now() },
      { name: "nested", type: "directory", mtime: 0 },
    ],
  });
  await exportJson("{}", "lifeos-2026-10-19-1234.json");
  expect(mocks.deleteFile).toHaveBeenCalledTimes(1);
  expect(mocks.deleteFile).toHaveBeenCalledWith({
    path: "lifeos-exports/old.json",
    directory: "CACHE",
  });
});
it("un échec d’écriture ou de partage est rendu au formulaire, sans annoncer une sauvegarde", async () => {
  mocks.writeFile.mockRejectedValueOnce(new Error("Stockage plein"));
  await expect(exportJson("{}", "lifeos-2026-10-19-1234.json")).rejects.toThrow(
    "Stockage plein",
  );
  expect(mocks.share).not.toHaveBeenCalled();
  mocks.share.mockRejectedValueOnce(new Error("Partage fermé"));
  await expect(exportJson("{}", "lifeos-2026-10-19-1234.json")).rejects.toThrow(
    "Partage fermé",
  );
});
