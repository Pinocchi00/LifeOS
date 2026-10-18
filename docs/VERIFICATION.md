# Vérifications du lot 0.1

Date : 18 octobre 2026. Environnement : Windows, Node.js 24.19.0, Chromium Playwright. Dépôt GitHub initial vide.

## Résultats observés

- `npm.cmd test` : **13 tests réussis**, 2 fichiers. Briefings, priorités, dates locales, sérialisation, refus de formats/versions/tailles invalides, identifiants dupliqués, relations incohérentes, dates impossibles, suppression d'un projet conservant ses tâches, persistance et refus d'écriture invalide.
- `npm.cmd run build` : **réussi**. Vérification TypeScript, compilation Vite et génération du service worker (11 ressources précachées).
- `npm.cmd run test:e2e` : **8 parcours réussis**, 4 parcours exécutés sur ordinateur et en émulation Pixel 7. CRUD tâches/projets, changement de statut, recherche, persistance après rechargement, suppression de projet sans perte des tâches, notes, export téléchargé, restauration après suppression de la donnée originale, refus de JSON invalide, contenu HTML affiché comme texte, cinq espaces sans débordement horizontal, cache hors ligne, création/persistance hors ligne et verrou multi-fenêtres.
- `npm.cmd audit` après correction de Capacitor : **0 vulnérabilité signalée** au moment de la vérification. Ce résultat ne constitue pas un audit de sécurité exhaustif.
- `npx.cmd cap add android` et `npx.cmd cap sync android` : **réussis**. Projet Android et ressources web générés.
- Captures ordinateur/mobile inspectées visuellement dans `test-results/` ; dossier exclu de Git.

Les premiers essais avaient révélé un sélecteur de formulaire ambigu et l'absence de contrôle immédiat des pages par le service worker. Ces points ont été corrigés puis les 8 parcours ont été rejoués avec succès.

## Vérifications non réalisées

- Compilation Gradle, APK, installation sur téléphone et comportement WebView : Java et SDK Android absents. Ne pas confondre émulation Pixel 7 dans Chromium et validation native Android.
- Tests Safari, Firefox, lecteurs d'écran, gros volumes et migrations d'un prototype ancien non disponible.
- Déclenchement des notifications, APIs d'assistants, quotas, GitHub dans l'application, données santé, veille externe : fonctionnalités non implémentées.
- Installation PWA par l'utilisateur via le menu navigateur : manifeste et cache testés, geste d'installation OS non automatisé.
- CI GitHub : workflow fourni ; son résultat distant doit être consulté après envoi, il ne remplace pas les résultats locaux ci-dessus.

## Principaux fichiers créés

- `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `index.html` : environnement et compilation.
- `src/domain/model.ts` et son test : modèles et logique métier pure, schémas et sauvegardes.
- `src/storage/database.ts`, `database.test.ts`, `useLifeOS.ts` : persistance et coordination.
- `src/App.tsx`, `src/main.tsx`, `src/styles.css`, `src/vite-env.d.ts` : application et interface.
- `tests/lifeos.spec.ts`, `playwright.config.ts` : régression navigateur.
- `public/icon.svg`, `icon-192.png`, `icon-512.png`, `scripts/New-Icons.ps1` : identité locale et icônes reproductibles.
- `capacitor.config.json`, `android/` : projet natif généré ; manifeste et règles d'extraction adaptés à la confidentialité. Fichiers compilés et secrets ignorés.
- `.gitignore`, `.github/workflows/checks.yml` : exclusions et CI.
- `README.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md`, `docs/CHANGELOG.md`, ce rapport : utilisation et suivi.

## Prochain lot

Centre de missions ChatGPT/Claude : critères, statut, projet et fichiers, comptes-rendus saisis par l'utilisateur, preuves, instructions copiables et suivi manuel des limites. Garder les connexions API facultatives et séparées. En parallèle, installer l'outillage Android pour valider l'enveloppe native et les sauvegardes sur appareil.
