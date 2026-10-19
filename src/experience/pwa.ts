import { registerSW } from "virtual:pwa-register";
let available = false;
let apply: ((reloadPage?: boolean) => Promise<void>) | undefined;
const listeners = new Set<() => void>();
export function startWorker() {
  if ("caches" in window)
    void caches.delete("lifeos-relief").catch(() => undefined);
  apply = registerSW({
    onNeedRefresh() {
      available = true;
      listeners.forEach((listener) => listener());
    },
    onRegisterError(error) {
      console.warn("Mode hors ligne indisponible", error);
    },
  });
}
export const subscribeUpdate = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const updateAvailable = () => available;
export async function applyUpdate() {
  await apply?.(true);
}
