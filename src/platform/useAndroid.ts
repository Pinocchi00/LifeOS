import { useEffect, useRef } from "react";
import { isAndroid } from "./runtime";
import type { PluginListenerHandle } from "@capacitor/core";

export function useAndroid(back: () => boolean, home: () => void) {
  const callbacks = useRef({ back, home });
  callbacks.current = { back, home };
  useEffect(() => {
    if (!isAndroid()) return;
    let disposed = false;
    const handles: PluginListenerHandle[] = [];
    const keep = (handle: PluginListenerHandle) => {
      if (disposed) void handle.remove();
      else handles.push(handle);
    };
    void (async () => {
      const [{ App }, { LocalNotifications }] = await Promise.all([
        import("@capacitor/app"),
        import("@capacitor/local-notifications"),
      ]);
      if (disposed) return;
      keep(
        await App.addListener("backButton", () => {
          const dialog = Array.from(
            document.querySelectorAll("dialog[open]"),
          ).at(-1);
          if (dialog)
            dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
          else if (!callbacks.current.back()) void App.minimizeApp();
        }),
      );
      keep(
        await LocalNotifications.addListener(
          "localNotificationActionPerformed",
          (event) => {
            if (event.notification.extra?.lifeos) callbacks.current.home();
          },
        ),
      );
    })().catch(() => console.warn("Navigation native indisponible."));
    return () => {
      disposed = true;
      handles.forEach((handle) => void handle.remove());
    };
  }, []);
}
