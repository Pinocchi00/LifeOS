import { registerPlugin } from "@capacitor/core";
import { z } from "zod";
import { isAndroid } from "./runtime";
const infoSchema = z
  .object({ origin: z.string().max(2048), sessionActive: z.boolean() })
  .strict();
export type NativeConnectorInfo = z.infer<typeof infoSchema>;
const plugin = registerPlugin<{
  info(): Promise<unknown>;
  configure(options: { origin: string }): Promise<unknown>;
  forget(): Promise<unknown>;
  request(options: {
    id: string;
    path: string;
    body?: string;
    durationMs: number;
  }): Promise<unknown>;
  cancel(options: { id: string }): Promise<void>;
}>("LifeosConnector");
export function nativeOrigin(value: string): string {
  if (value.length > 2048) throw new Error("Adresse trop longue.");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(
      "Utilisez une adresse HTTPS complète, par exemple https://lifeos.exemple.fr.",
    );
  }
  if (
    url.protocol !== "https:" ||
    url.origin !== value ||
    url.hostname.endsWith(".") ||
    url.username ||
    url.password
  )
    throw new Error(
      "Utilisez une adresse HTTPS seule, sans barre finale, chemin ou identifiant.",
    );
  return url.origin;
}
export async function nativeConnectorInfo(): Promise<NativeConnectorInfo> {
  if (!isAndroid()) throw new Error("Réglage réservé à Android.");
  const info = infoSchema.parse(await plugin.info());
  if (info.origin) nativeOrigin(info.origin);
  return info;
}
export async function configureNativeConnector(origin: string) {
  if (!isAndroid()) throw new Error("Réglage réservé à Android.");
  return infoSchema.parse(
    await plugin.configure({ origin: nativeOrigin(origin) }),
  );
}
export async function forgetNativeConnector() {
  if (!isAndroid()) throw new Error("Réglage réservé à Android.");
  return infoSchema.parse(await plugin.forget());
}
export async function nativeConnectorRequest(
  path: string,
  body: unknown,
  signal: AbortSignal | undefined,
  durationMs: number,
) {
  if (!isAndroid()) throw new Error("Transport réservé à Android.");
  if (
    !/^(status|pair|logout|github\/read|ai\/(status|prepare|execute))$/.test(
      path,
    )
  )
    throw new Error("Opération refusée.");
  if (signal?.aborted) throw new Error("Opération annulée.");
  const id = crypto.randomUUID();
  return new Promise<unknown>((resolve, reject) => {
    const cancel = () => {
      void plugin.cancel({ id }).catch(() => {});
      reject(
        new Error(
          "Opération annulée. Aucun réessai automatique ; un envoi IA peut avoir été facturé.",
        ),
      );
    };
    signal?.addEventListener("abort", cancel, { once: true });
    plugin
      .request({
        id,
        path,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        durationMs,
      })
      .then((raw) => {
        if (signal?.aborted) return;
        const result = z
          .object({
            status: z.number().int().min(200).max(599),
            value: z.unknown(),
          })
          .strict()
          .safeParse(raw);
        if (!result.success) {
          reject(new Error("Réponse native incompatible."));
          return;
        }
        if (result.data.status < 200 || result.data.status >= 300) {
          const error = z
            .object({ error: z.string().min(1).max(300) })
            .strict()
            .safeParse(result.data.value);
          reject(
            new Error(
              error.success
                ? error.data.error
                : "Le serveur refuse cette opération.",
            ),
          );
        } else resolve(result.data.value);
      }, reject)
      .finally(() => signal?.removeEventListener("abort", cancel));
  });
}
