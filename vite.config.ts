import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icon.svg", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "LifeOS — Votre quotidien, en clair",
        short_name: "LifeOS",
        lang: "fr",
        description: "Organisation personnelle privée et locale",
        theme_color: "#20372a",
        background_color: "#ece9df",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
      workbox: {
        clientsClaim: true,
        globPatterns: ["**/*.{js,css,html,svg,png,jpg,woff2}"],
        navigateFallback: "index.html",
      },
    }),
  ],
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
