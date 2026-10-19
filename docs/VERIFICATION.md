# Vérifications LifeOS

## Lot 0.4 — 19 octobre 2026

- Retrait du moteur WebGL, de `three` et `@types/three`, du chunk et de sa règle de cache. Le jardin illustré et ses commandes HTML restent utilisables hors ligne. L’ancien cache optionnel est supprimé au démarrage.
- **42 tests Vitest**, cinq fichiers : migrations IndexedDB v1/v2 → v3, validation et aller-retour JSON de toute la planification, calcul de semaine au changement d’année/d’heure, horaires invalides, chevauchements y compris intervalles emboîtés, temps réservé sans double comptage, échéance indépendante du créneau, routines datées, pause/historique et objectifs réversibles.
- **26 parcours Playwright** sur ordinateur et format Pixel 7 : régressions existantes, semaine/mois, navigation par date, retrait d’un créneau, avertissement de conflit, routines réalisées et futures désactivées, modification/pause conservant les faits passés, suppression/restauration, usage hors ligne, objectifs et ajout d’étapes, réouverture, recherche et suppression sans référence orpheline. Le test 3D est remplacé par le contrôle du jardin illustré hors ligne sans canvas ni requête de moteur.
- Le premier lancement navigateur a commencé avant la fin de la génération du service worker : les attentes hors ligne ont expiré. La compilation a ensuite été attendue jusqu’à sa fin avant relance. Un sélecteur de test d’objectif visant plusieurs commandes a aussi été précisé pour cibler la case à cocher. Les parcours ont été rejoués avec succès.
- Compilation TypeScript/Vite/PWA réussie. Le JavaScript principal représente environ **124 Ko gzip** ; le chunk 3D d’environ 135 Ko gzip est supprimé. Le visuel original et les données métier restent précachés pour le hors ligne. Aucun avertissement de chunk de plus de 500 Ko dans cette version.
- Contrôle visuel avec données fictives isolées : semaine, mois, routines et objectifs à 1440, 768, 393 et 320 pixels, sans débordement horizontal ni erreur JavaScript de page. Captures locales de l’agenda et des objectifs inspectées.
- `npm uninstall` a signalé **0 vulnérabilité** lors du retrait des dépendances. Projet Capacitor resynchronisé avec la compilation web.
- Limites : aucun APK ni essai Android physique ; ni Safari/Firefox ni lecteur d’écran réel testés. Pas de calendrier externe, glisser-déposer, récurrence mensuelle ou horaire traversant minuit. Les dates/heures suivent l’appareil, sans conversion de fuseau. Les occurrences de routine passées non réalisées suivent la définition actuelle ; seules les réalisations sont historisées. Le temps réservé n’est pas une mesure de temps effectivement travaillé.

Principaux fichiers : `src/components/Planning.tsx`, `PlanningForms.tsx`, `src/domain/planning.ts`, `planningSchema.ts`, `planning.test.ts`, `src/planning.css`, `src/App.tsx`, `src/domain/model.ts`, `src/storage/database.ts`, `tests/planning.spec.ts`. Suppression de `src/experience/gardenScene.ts` ; adaptations du jardin, du PWA et des tests existants. Aucun jeu de données personnel publié.

Prochain lot : Vie, avec sport, nutrition, recettes et habitudes ; les futures données de santé auront un stockage séparé.

## Lot 0.3 — 19 octobre 2026

- **28 tests Vitest réussis**, dont les six nouveaux scénarios de direction : espace vide, priorité réelle, tâches futures, projets conservés sans projet actif, missions à vérifier et bilan du jour local.
- **22 parcours Playwright réussis** sur ordinateur et format Pixel 7. Les nouvelles vérifications couvrent concentration et réouverture, annulation persistante, accès directs, protection d'une saisie par Échap/croix, Ctrl+K, focus clavier, mode calme persistant et priorité des réglages système.
- Scène WebGL réellement initialisée dans Chromium avec SwiftShader : rendu fixe au repos et en mode animé après stabilisation, sélection des terrasses, cache optionnel absent du précache initial, rechargement hors ligne après première utilisation, repli sans WebGL et suppression du canvas à la navigation.
- Budget observé : **43 appels de dessin** pour la scène ; test imposant moins de 50 et un ratio de pixels au plus égal à 1,5. Ces mesures sont des contrôles techniques, pas un benchmark de téléphone réel.
- Compilation réussie : application principale d'environ 118 Ko gzip, chunk 3D séparé d'environ 135 Ko gzip. Vite signale la taille brute du chunk Three.js (>500 Ko) ; celui-ci est volontairement différé et exclu du téléchargement de précache initial.
- PWA : ressources métier et image originales précachées ; cache 3D à la demande. Après l'ajout de l'avis de mise à jour, les quatre parcours hors ligne/3D ont été rejoués avec succès.
- Contrôles visuels du jardin, de la version mobile à 320 pixels et de l'alerte de saisie ; courte démonstration locale enregistrée sans données personnelles.
- Les premiers essais ont révélé un focus trop précoce avant l'ouverture du dialogue et un sélecteur de test devenu ambigu (titre dans le briefing et la liste). Le focus a été corrigé ; le test vise maintenant la commande de tâche.
- Limites : pas de test sur appareil Android physique, Safari/Firefox ou lecteur d'écran réel ; pas de mesure de consommation électrique ni de garantie universelle de cadence. L'APK reste non construit.

Fichiers principaux : `src/components/DailyGarden.tsx`, `FocusSession.tsx`, `UpdateNotice.tsx`, `src/experience/gardenScene.ts`, `useMotion.ts`, `pwa.ts`, `src/domain/garden.ts` et son test, `src/living-garden.css`, `tests/experience.spec.ts`. L'image du jardin déjà produite est réutilisée sans retouche.

## Lot 0.2 — 19 octobre 2026

- **22 tests Vitest réussis**, 3 fichiers : les tests existants plus les missions, validation humaine, preuves HTTP/HTTPS, compteurs, rapports et migration réelle IndexedDB v1 → v2.
- **12 parcours Playwright réussis** : 6 scénarios exécutés sur ordinateur et format Pixel 7. Les nouveaux parcours couvrent le cycle complet d'une mission, les instructions et le presse-papiers/repli, le refus de clôture sans compte-rendu, la conservation des rapports, les filtres, la recherche, la suppression de projet conservant la mission, les compteurs non réinitialisés automatiquement, l'export v2 et la restauration v1.
- Le parcours hors ligne vérifie aussi que le visuel botanique local reste chargé après rechargement sans réseau.
- Compilation TypeScript/Vite/PWA réussie : 12 ressources précachées, incluant le JPEG original encodé pour l'application.
- Captures accueil ordinateur/mobile inspectées pour la nouvelle direction écobrutaliste. Les données d'essai des tests restent dans des contextes isolés, sans publication de données personnelles.
- Atelier et formulaires contrôlés à 768, 393 et 320 pixels, sans débordement horizontal ; captures du centre et du compteur également inspectées.
- Projet Android resynchronisé avec les ressources du lot ; compilation native toujours non réalisée faute de Java/SDK Android.
- Nouveaux modules : `src/domain/assistants.ts`, `src/domain/validation.ts`, `src/components/Assistants.tsx`, `src/ecobrutalism.css`, tests associés et `public/art/concrete-garden.jpg`. Le prompt du visuel est dans `ASSETS.md`.
- Limites : aucun assistant connecté, aucune lecture de quota fournisseur, aucun envoi de mission ni synchronisation externe. APK et notifications toujours en attente d'outillage et d'essais natifs.
- Prochain lot dans l'ordre convenu : agenda hebdomadaire, horaires, routines et objectifs.

Les sections suivantes conservent l'historique des lots précédents.

## Lot visuel 0.1.1 — Brutalisme zen

- Compilation TypeScript/Vite et PWA réussie après la refonte.
- Les 8 parcours Playwright existants passent sur ordinateur et format Pixel 7 : CRUD, recherche, sauvegardes, hors ligne, navigation et absence de débordement.
- Captures ordinateur/mobile inspectées ; traitement du défilement de la navigation latérale sur fenêtre basse.
- Contrôle complémentaire : les cinq espaces à 320 pixels sans débordement, formulaire étroit avec champs empilés, accès aux sauvegardes dans une fenêtre de 600 pixels de hauteur.
- Aucun modèle de données ou mécanisme de persistance modifié ; les modules encore prévus restent décrits dans la roadmap.

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
