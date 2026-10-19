# LifeOS — Roadmap

État initial : dépôt vide, aucun prototype 0.2 disponible. Le lot 0.1 vise les phases 0 et 1, avec les fondations des briefings et sauvegardes. Aucun service externe requis.

Direction artistique : le lot 0.2 poursuit le brutalisme zen avec les références écobrutalistes et botaniques fournies : béton, végétation, vert forêt et typographie éditoriale. Voir `DIRECTION-ARTISTIQUE.md` pour les choix visuels.

Lot 0.3 livré à la demande de reprise visuelle : jardin 3D interactif à chargement différé, navigation animée, actions contextuelles, concentration et protection des saisies. Les règles métier restent locales. Au lot 0.4, la 3D est retirée à la demande de l’utilisateur et le jardin illustré conservé. L’agenda avancé est livré. Le lot 0.5 ajoute les suivis personnels locaux ; le lot 0.6 livre la bibliothèque sourcée et l’apprentissage local. Android et fiabilité native sont le prochain lot.

## Phase 0 — Architecture et fondations

- Tâches : React/TypeScript/Vite, modules métier, IndexedDB versionné, navigation responsive, PWA, tests Vitest/Playwright, documentation de démarrage.
- Dépendances : Node.js et npm ; navigateur moderne.
- Acceptation : compilation réussie, données persistantes après rechargement, navigation mobile utilisable, tests exécutés.
- État : livré pour le lot initial. React/TypeScript/Vite, IndexedDB, PWA, navigation et tests validés. Migration sans objet : dossier local et dépôt GitHub vides. Optimisations et migrations futures à poursuivre en phase 8.

## Phase 1 — Organisation quotidienne

- Tâches : accueil calculé à partir des données locales, tâches et projets CRUD, agenda mois/jour, échéances, priorités, recherche, capture rapide, briefings matin/soir.
- Dépendances : phase 0.
- Acceptation : créer/modifier/terminer/supprimer une tâche ; gérer un projet ; retrouver les données après rechargement ; briefings sans données inventées.
- État : premier lot fonctionnel livré et testé. Accueil, agenda mois/jour, tâches et projets CRUD, recherche, idées et briefings locaux utilisables. Lot 0.4 : vue hebdomadaire, navigation mois/jour, créneaux horaires indépendants des échéances, programme chronologique, chevauchements, routines hebdomadaires et réalisations datées, objectifs à étapes liées aux tâches, recherche et sauvegarde v3 livrés et testés. Les déplacements se font par le formulaire ; pas de glisser-déposer, récurrence mensuelle ou calendrier externe. Les raffinements ultérieurs de planification restent possibles.

## Phase 2 — Assistants

- Tâches : missions ChatGPT/Claude, statuts, critères, fichiers, rapports et preuves, copie d'instructions, limites manuelles.
- Dépendances : projets persistants ; aucune API implicite.
- Acceptation : cycle de mission complet, rapports saisis explicitement, aucune connexion simulée.
- État : livré pour la gestion locale. Missions ChatGPT/Claude, cinq statuts, projet/fichiers, objectifs/critères, historique des comptes-rendus et preuves, instructions copiables, validation explicite et compteurs manuels implémentés. Inclusion dans les briefings, recherche et sauvegardes v2 ; migration des données v1. La connexion GitHub et les APIs restent en phase 7.

Ordre de poursuite demandé : agenda avancé (semaine, horaires, routines, objectifs), Vie, Explorer, Android, adaptation, connecteurs puis stabilisation 1.0. L’agenda avancé est livré au lot 0.4, Vie au lot 0.5 pour les suivis locaux. Explorer est livré au lot 0.6 pour les ressources et apprentissages locaux. Prochain lot : Android et fiabilité native. Chaque suite se traite en lot cohérent avec vérifications réelles.

## Phase 3 — Vie personnelle

- Tâches : sport et progression, recettes et ingrédients, courses, habitudes, sommeil ; stockage santé distinct.
- Dépendances : phase 0 et modèle de confidentialité dédié.
- Acceptation : suivis datés persistants, données santé séparées, export sélectif vérifié.
- État : lot local 0.5 livré. Séances sportives datées, exercices et historique comparable, reprise comme modèle ; recettes, repas prévus/pris et quantités conservées ; stock, calcul des manquants et rangement explicite des courses ; habitudes avec réalisations et pause ; nuits avec durée et ressenti saisis. Base Vie distincte des données d’organisation, export sélectif et restauration par rubrique vérifiés. Aucun suivi Vie dans la recherche ou l’export général. À poursuivre ultérieurement : programmes sportifs structurés, mesures connectées, siestes multiples et fonctions de santé plus détaillées ; aucun diagnostic ni recommandation médicale dans ce lot.

## Phase 4 — Explorer

- Tâches : notes, inspirations, ressources avec sources, apprentissage, flux d'actualités explicitement datés.
- Dépendances : capture/recherche ; connecteurs facultatifs pour les actualités.
- Acceptation : ressources recherchables, sources consultables, aucune fausse actualité temps réel.
- État : lot local 0.6 livré et testé. Ressources avec auteur/organisme, lien HTTP/HTTPS ou référence hors ligne, dates déclarées, annotations, thèmes, favoris, lecture et liens aux idées/projets. Parcours à étapes, progression explicite et séances datées conservant leurs titres historiques. Recherche, sauvegarde v4 et migrations v1/v2/v3 vérifiées. Les actualités peuvent être enregistrées comme fiches datées et sourcées ; aucune collecte ou vérification automatique, aucun flux temps réel annoncé. Les connecteurs de veille restent prévus en phase 7.

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
