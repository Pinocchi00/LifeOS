import { isAndroid } from "./runtime";

// Keep grants usable while the receiving app copies the export. Only expired
// files from our own cache folder are removed on the next export.
const folder = "lifeos-exports";
export async function exportJson(raw: string, filename: string): Promise<void> {
  if (!/^lifeos(?:-vie)?-\d{4}-\d{2}-\d{2}-\d+\.json$/.test(filename))
    throw new Error("Nom de sauvegarde invalide.");
  if (!isAndroid()) {
    const url = URL.createObjectURL(
      new Blob([raw], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
    import("@capacitor/filesystem"),
    import("@capacitor/share"),
  ]);
  try {
    const previous = await Filesystem.readdir({
      path: folder,
      directory: Directory.Cache,
    });
    for (const file of previous.files) {
      if (file.type === "file" && file.mtime < Date.now() - 86400000)
        await Filesystem.deleteFile({
          path: `${folder}/${file.name}`,
          directory: Directory.Cache,
        });
    }
  } catch {
    // A missing folder or failed cache cleanup must not prevent a fresh export.
  }
  const result = await Filesystem.writeFile({
    path: `${folder}/${filename}`,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
    data: raw,
    recursive: true,
  });
  await Share.share({
    title: "Sauvegarde LifeOS",
    dialogTitle: "Enregistrer votre sauvegarde JSON",
    files: [result.uri],
  });
}
