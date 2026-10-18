import { useEffect, useState } from "react";
const key = "lifeos-motion";
export function useMotion() {
  const [preference, setPreference] = useState(() => {
    try {
      return localStorage.getItem(key) === "calm" ? "calm" : "system";
    } catch {
      return "system";
    }
  });
  const [systemReduced, setSystemReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const changed = () => setSystemReduced(media.matches);
    media.addEventListener("change", changed);
    return () => media.removeEventListener("change", changed);
  }, []);
  const calm = systemReduced || preference === "calm";
  useEffect(() => {
    document.documentElement.dataset.motion = calm ? "calm" : "full";
  }, [calm]);
  function toggle() {
    const next = preference === "calm" ? "system" : "calm";
    setPreference(next);
    try {
      localStorage.setItem(key, next);
    } catch {
      /* The current session still respects the choice. */
    }
  }
  return { calm, toggle, systemReduced, preference };
}
