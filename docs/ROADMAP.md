# LifeOS — Roadmap

État initial : dépôt vide, aucun prototype 0.2 disponible. Le lot 0.1 vise les phases 0 et 1, avec les fondations des briefings et sauvegardes. Aucun service externe requis.

Direction artistique : le lot 0.1.1 applique l'identité « Brutalisme zen » aux cinq espaces, aux formulaires et à la PWA. Voir `DIRECTION-ARTISTIQUE.md` pour les choix visuels.

## Phase 0 — Architecture et fondations

- Tâches : React/TypeScript/Vite, modules métier, IndexedDB versionné, navigation responsive, PWA, tests Vitest/Playwright, documentation de démarrage.
- Dépendances : Node.js et npm ; navigateur moderne.
- Acceptation : compilation réussie, données persistantes après rechargement, navigation mobile utilisable, tests exécutés.
- État : livré pour le lot initial. React/TypeScript/Vite, IndexedDB, PWA, navigation et tests validés. Migration sans objet : dossier local et dépôt GitHub vides. Optimisations et migrations futures à poursuivre en phase 8.

## Phase 1 — Organisation quotidienne

- Tâches : accueil calculé à partir des données locales, tâches et projets CRUD, agenda mois/jour, échéances, priorités, recherche, capture rapide, briefings matin/soir.
- Dépendances : phase 0.
- Acceptation : créer/modifier/terminer/supprimer une tâche ; gérer un projet ; retrouver les données après rechargement ; briefings sans données inventées.
- État : premier lot fonctionnel livré et testé. Accueil, agenda mois/jour, tâches et projets CRUD, recherche, idées et briefings locaux utilisables. À poursuivre : vue hebdomadaire, créneaux horaires, routines, objectifs et planification avancée.

## Phase 2 — Assistants

- Tâches : missions ChatGPT/Claude, statuts, critères, fichiers, rapports et preuves, copie d'instructions, limites manuelles.
- Dépendances : projets persistants ; aucune API implicite.
- Acceptation : cycle de mission complet, rapports saisis explicitement, aucune connexion simulée.
- État : prévu. Écran d'information uniquement ; aucun assistant connecté ni mission simulée.

## Phase 3 — Vie personnelle

- Tâches : sport et progression, recettes et ingrédients, courses, habitudes, sommeil ; stockage santé distinct.
- Dépendances : phase 0 et modèle de confidentialité dédié.
- Acceptation : suivis datés persistants, données santé séparées, export sélectif vérifié.
- État : prévu.

## Phase 4 — Explorer

- Tâches : notes, inspirations, ressources avec sources, apprentissage, flux d'actualités explicitement datés.
- Dépendances : capture/recherche ; connecteurs facultatifs pour les actualités.
- Acceptation : ressources recherchables, sources consultables, aucune fausse actualité temps réel.
- État : partiellement livré. Carnet d'idées et recherche locale testés. Flux d'actualités, ressources structurées et apprentissage restent prévus ; aucune veille en temps réel annoncée.

## Phase 5 — Android et fiabilité

- Tâches : configuration Capacitor, génération du projet Android, APK, tests sur appareil, notifications avec consentement, sauvegardes/restaurations JSON.
- Dépendances : phase 0, Android Studio/JDK/SDK pour l'APK.
- Acceptation : installation et usage hors ligne sur appareil ; restauration atomique validée ; refus des fichiers invalides.
- État : partiellement livré. Sauvegarde/restauration testée, PWA hors ligne testée, projet Android généré et synchronisé. APK, notifications et tests natifs en attente de Java/SDK Android et d'un appareil.

## Phase 6 — Adaptation

- Tâches : règles explicables, préférences explicites, feedback, historique des décisions et versions de configuration réversibles.
- Dépendances : historique d'usage réel ; validations utilisateur.
- Acceptation : chaque recommandation explique sa source, feedback conservé, configuration restaurable.
- État : partiellement livré. Première règle locale expliquée dans le tableau de bord ; préférences, feedback, mémoire et historique des configurations restent prévus.

## Phase 7 — Connecteurs facultatifs

- Tâches : GitHub pour missions, connecteurs IA côté serveur sécurisé, catalogue sourcé des modèles, coûts, automatisations validées.
- Dépendances : validation explicite, gestion de secrets hors client.
- Acceptation : mode local indépendant, aucun secret client, dépenses et connexions sous contrôle.
- État : prévu.

## Phase 8 — LifeOS 1.0

- Tâches : audit sécurité, migrations, volumétrie, accessibilité, tests régression et multiappareil, optimisation.
- Dépendances : phases précédentes stabilisées.
- Acceptation : suite de régression verte, restauration et migrations testées, Android vérifié, limitations documentées.
- État : prévu.
