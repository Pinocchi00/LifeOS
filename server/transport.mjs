import { readFile, stat, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { X509Certificate, createPrivateKey } from "node:crypto";
import { isIP } from "node:net";
import { createSecureContext } from "node:tls";

export function transportConfig(env) {
  const values = [
    env.LIFEOS_REMOTE_ORIGIN,
    env.LIFEOS_TLS_CERT_FILE,
    env.LIFEOS_TLS_KEY_FILE,
  ];
  const bind = env.LIFEOS_BIND_ADDRESS;
  if (!values.some(Boolean)) {
    if (bind)
      throw new Error(
        "Une adresse d’écoute distante exige une configuration HTTPS complète.",
      );
    return null;
  }
  if (values.some((value) => typeof value !== "string" || !value.trim()))
    throw new Error("HTTPS exige origine, certificat et clé TLS ensemble.");
  let url;
  try {
    url = new URL(values[0]);
  } catch {
    throw new Error("Origine HTTPS invalide.");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.hostname.endsWith(".") ||
    values[0] !== url.origin ||
    !["127.0.0.1", "0.0.0.0", "::"].includes(bind || "127.0.0.1")
  )
    throw new Error(
      "Utilisez une origine HTTPS canonique seule et une adresse d’écoute autorisée.",
    );
  if (
    !isAbsolute(values[1]) ||
    !isAbsolute(values[2]) ||
    resolve(values[1]) === resolve(values[2])
  )
    throw new Error(
      "Certificat et clé TLS exigent deux chemins absolus distincts.",
    );
  return {
    origin: url.origin,
    host: url.host,
    hostname: url.hostname.replace(/^\[|\]$/g, ""),
    port: Number(url.port || 443),
    bind: bind || "127.0.0.1",
    certFile: values[1],
    keyFile: values[2],
  };
}
const inside = (root, file) => {
  const part = relative(root, file);
  return (
    part === "" ||
    (!part.startsWith(`..${sep}`) && part !== ".." && !isAbsolute(part))
  );
};
export async function transportOptions(remote, distRoot, time = Date.now()) {
  if (!remote) return {};
  try {
    const roots = await Promise.all([
      realpath(distRoot),
      realpath(resolve(distRoot, "../public")).catch(() =>
        resolve(distRoot, "../public"),
      ),
    ]);
    for (const path of [remote.certFile, remote.keyFile]) {
      const actual = await realpath(path);
      if (roots.some((root) => inside(root, actual))) throw new Error();
      const info = await stat(path);
      if (!info.isFile() || info.size > 2 * 1024 * 1024) throw new Error();
    }
    const [cert, key] = await Promise.all([
      readFile(remote.certFile),
      readFile(remote.keyFile),
    ]);
    if (cert.length > 2 * 1024 * 1024 || key.length > 2 * 1024 * 1024)
      throw new Error();
    const leaf = new X509Certificate(cert);
    if (
      !leaf.subjectAltName ||
      Date.parse(leaf.validFrom) > time ||
      Date.parse(leaf.validTo) <= time ||
      !leaf.checkPrivateKey(createPrivateKey(key)) ||
      !(isIP(remote.hostname)
        ? leaf.checkIP(remote.hostname)
        : leaf.checkHost(remote.hostname, { subject: "never" }))
    )
      throw new Error();
    const options = { cert, key, minVersion: "TLSv1.2" };
    createSecureContext(options);
    return options;
  } catch {
    throw new Error(
      "Configuration TLS refusée : vérifiez fichiers privés hors build/public, dates, nom du certificat et correspondance de la clé.",
    );
  }
}
