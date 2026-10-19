import { registerSW } from "virtual:pwa-register";
import { Capacitor } from "@capacitor/core";
let available = false;
let apply: ((reloadPage?: boolean) => Promise<void>) | undefined;
const listeners = new Set<() => void>();
export function startWorker() {
  // Native assets arrive with the APK. A service worker could serve assets from
  // an older installed version after an Android update.
  if (Capacitor.isNativePlatform()) return;
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
