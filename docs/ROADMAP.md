# LifeOS — Roadmap

État initial : dépôt vide, aucun prototype 0.2 disponible. Le lot 0.1 vise les phases 0 et 1, avec les fondations des briefings et sauvegardes. Aucun service externe requis.

Direction artistique : le lot 0.2 poursuit le brutalisme zen avec les références écobrutalistes et botaniques fournies : béton, végétation, vert forêt et typographie éditoriale. Voir `DIRECTION-ARTISTIQUE.md` pour les choix visuels.

Lot 0.3 livré à la demande de reprise visuelle : jardin 3D interactif à chargement différé, navigation animée, actions contextuelles, concentration et protection des saisies. Les règles métier restent locales. Au lot 0.4, la 3D est retirée à la demande de l’utilisateur et le jardin illustré conservé. L’agenda avancé est livré. Le lot 0.5 ajoute les suivis personnels locaux ; le lot 0.6 livre la bibliothèque sourcée et l’apprentissage local. Le lot 0.7 apporte l’APK de développement, les sauvegardes et rappels natifs ; la recette physique et la distribution de production restent ouvertes. Le lot 0.8 ajoute l’adaptation explicable et les sauvegardes v5. Le lot 0.9 ouvre les références GitHub publiques des missions, avec lectures volontaires et relevés sauvegardés en v6. Le lot 0.10 ajoute un serveur GitHub privé facultatif en boucle locale pour le navigateur, sans clé fournisseur dans le client. Le lot 0.11 ajoute l’API OpenAI facultative et ses réserves quotidiennes durables, sur cette même frontière locale. Le lot 0.12 ajoute Anthropic, deux modèles Claude et un budget commun aux fournisseurs.

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

Ordre de poursuite demandé : agenda avancé (semaine, horaires, routines, objectifs), Vie, Explorer, Android, adaptation, connecteurs puis stabilisation 1.0. L’agenda avancé est livré au lot 0.4, Vie au lot 0.5 pour les suivis locaux. Explorer est livré au lot 0.6, l’APK de développement et les fonctions natives au lot 0.7. Le lot 0.8 livre l’adaptation explicable. Premier lot de connecteur livré en 0.9 : GitHub public en lecture seule. Le lot 0.10 livre le serveur GitHub privé en boucle locale pour le navigateur, avec appairage et dépôts autorisés. Le lot 0.11 ajoute OpenAI pour un brouillon de mission, avec aperçu exact, consentement, limites durables et catalogue daté à un modèle. Le lot 0.12 ajoute Claude/Anthropic, le choix Sonnet/Haiku, les sources et tarifs propres à chacun, avec limites communes et adoption vérifiant l’assistant. La suite concerne notamment les modèles supplémentaires, l’accès distant authentifié et les automatisations validées. La recette Android sur téléphone physique et la signature de production restent à valider. Chaque suite se traite en lot cohérent avec vérifications réelles.

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
- État : lot de développement 0.7 livré. JDK/SDK locaux, APK debug construit et lint réussi, script de reconstruction et versions cohérentes, export natif par partage pour organisation et Vie, retour Android protégé, marges système, icônes et rappel quotidien avec consentement explicite. Ressources embarquées sans service worker natif ; aucun serveur requis. Scénario instrumenté et CI Android ajoutés ; résultats consignés dans `VERIFICATION.md`. Restent ouverts : téléphone physique, comportement des fabricants/redémarrage/changements d’heure, signature de production et distribution store. Les tests web Pixel 7 ne sont pas présentés comme des tests natifs.

## Phase 6 — Adaptation

- Tâches : règles explicables, préférences explicites, feedback, historique des décisions et versions de configuration réversibles.
- Dépendances : historique d'usage réel ; validations utilisateur.
- Acceptation : chaque recommandation explique sa source, feedback conservé, configuration restaurable.
- État : lot local 0.8 livré. Une à cinq priorités et ordre choisis explicitement, conseils déterministes avec sources/chiffres/version, masquage par type ou global, retours utiles ou écartés pour la journée locale avec annulation et instantanés, carnet de décisions recherchable avec réexamen manuel, configurations motivées et restaurables par nouvelle version. Sauvegarde générale v5 et migrations v1 à v4, base Vie inchangée. Aucun apprentissage caché ni conseil fondé sur Vie ; mode calme et notifications restent propres à l’appareil. Vérifications dans `VERIFICATION.md`.

## Phase 7 — Connecteurs facultatifs

- Tâches : GitHub pour missions, connecteurs IA côté serveur sécurisé, catalogue sourcé des modèles, coûts, automatisations validées.
- Dépendances : validation explicite, gestion de secrets hors client.
- Acceptation : mode local indépendant, aucun secret client, dépenses et connexions sous contrôle.
- État : premier lot 0.9 livré pour GitHub public en lecture seule. Liens d’issues, PR et exécutions Actions par mission, consultation explicite sans jeton, relevés datés conservant état/commit/tentative, historique borné sans effacement implicite, annulation et erreurs conservant le dernier relevé. Aucun appel à l’ouverture, à la restauration ou en arrière-plan ; aucune écriture GitHub et aucun changement automatique de mission. Format général v6 et migration v5 préservant préférences/historiques, imports v1 à v4 conservés. Lot 0.10 : serveur Node facultatif sur 127.0.0.1, jeton fournisseur uniquement dans le processus, appairage temporaire par code, session HttpOnly révocable, dépôts autorisés exacts, lectures privées seules, limites et annulation ; parcours privé uniquement dans le navigateur de cet ordinateur. Format v6 et Vie inchangés, pas de secret ou connexion dans les sauvegardes. Restent ouverts : GitHub Enterprise, accès distant HTTPS/authentification adaptée et privé Android, synchronisation distante des missions, modèles supplémentaires, catalogue à maintenir, rapprochement de facturation et automatisations à valider. Le lot 0.11 livre le premier accès OpenAI par serveur local : modèle et tarifs datés, aperçu exact à autorisation unique, comptage puis génération bornée, registre SQLite durable des réserves quotidiennes et adoption volontaire en compte-rendu non vérifié. Format v6 conservé, aucun appel API réel payé pendant les essais. Aucun compte externe, secret client ni dépense configuré par ce lot.

Lot 0.12 : Claude Sonnet 5.5 et Haiku 5.5 sur le même serveur local, configuration facultative indépendante des clés, autorisation liée au modèle et limites communes aux fournisseurs, sans changement du format v6. La prochaine étape de phase 7 concerne l’accès distant HTTPS/authentification et Android privé ; elle nécessite de choisir un hébergement et une identité d’accès avant une mise en service réelle. Les automatisations restent soumises à un périmètre et une validation explicites.

## Phase 8 — LifeOS 1.0

- Tâches : audit sécurité, migrations, volumétrie, accessibilité, tests régression et multiappareil, optimisation.
- Dépendances : phases précédentes stabilisées.
- Acceptation : suite de régression verte, restauration et migrations testées, Android vérifié, limitations documentées.
- État : prévu.
