const scenes = {
  projects: {
    file: "atelier-vegetal",
    name: "Atelier végétal",
    alt: "Terrasses de béton brut et plantes grimpantes autour d’un arbre.",
  },
  life: {
    file: "jardin-interieur",
    name: "Jardin intérieur",
    alt: "Bassin calme entre murs de béton et grandes feuilles tropicales.",
  },
  explore: {
    file: "passage-botanique",
    name: "Passage botanique",
    alt: "Un passage de piliers en béton ouvert sur un jardin luxuriant.",
  },
} as const;

export function EcoScene({ space }: { space: keyof typeof scenes }) {
  const scene = scenes[space];
  return (
    <figure className={`eco-scene eco-scene-${space}`}>
      <img
        src={`/art/${scene.file}-768.webp`}
        srcSet={`/art/${scene.file}-768.webp 768w, /art/${scene.file}-1536.webp 1536w`}
        sizes="(max-width: 650px) calc(100vw - 40px), (max-width: 1100px) calc(100vw - 140px), calc(100vw - 340px)"
        width="1536"
        height="1024"
        alt={scene.alt}
        decoding="async"
      />
      <figcaption>{scene.name}</figcaption>
    </figure>
  );
}
