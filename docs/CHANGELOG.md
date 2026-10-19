# Journal des modifications

## 0.4.0 — 19 octobre 2026

- Suppression de la scène WebGL, de Three.js, de ses types et du cache optionnel. Le jardin original, les actions contextuelles et les transitions légères restent présents.
- Agenda semaine/mois, sélection de jour, programme chronologique et navigation directe par date.
- Créneaux jour/heure/durée indépendants des échéances ; replanification par formulaire et retrait du créneau sans suppression de la tâche.
- Détection des chevauchements et calcul du temps réservé sans double comptage, sur les engagements non terminés.
- Routines hebdomadaires datées, pause, réalisation/réouverture par jour et historique conservant les informations réellement enregistrées. Aucune tâche récurrente dupliquée.
- Objectifs liés aux tâches, progression calculée et réversible, ajout d’étapes et suppression conservant les tâches.
- Recherche des routines et objectifs, synthèse des routines dans le jardin, sauvegardes v3 et migration locale/import v1/v2 sans perte.
- Nouveaux tests métier, migrations IndexedDB et parcours navigateur ordinateur/mobile. Documentation d’usage et roadmap mises à jour.

## 0.3.0 — 19 octobre 2026

- Accueil réorganisé autour du jardin de travail : trois terrasses sélectionnables et prochaine action selon les tâches, projets ou missions réels.
- Vraie scène WebGL Three.js : béton, plantations instanciées, éclairage, ombres et interaction par pointeur ; commande équivalente en HTML.
- Chargement 3D différé, cache optionnel séparé, densité de pixels plafonnée, rendu à la demande et libération des ressources en quittant l'accueil.
- Mode concentration, passage à la priorité suivante et réouverture de la dernière clôture ; annulation aussi disponible depuis la confirmation globale.
- Compteurs cliquables, transitions de navigation et micro-interactions, mode calme persistant et respect des préférences système.
- Protection des saisies contre une fermeture accidentelle ; Ctrl+K ne remplace plus un dialogue ouvert.
- Navigation au clavier, focus du contenu et annonces contextuelles ; mise à jour PWA proposée sans rechargement forcé.
- Règles, tests métier et parcours navigateur dédiés. Données métier toujours au format v2, sans migration supplémentaire.

## 0.2.0 — 19 octobre 2026

- Centre de missions ChatGPT/Claude dans Projets : objectifs, critères, fichiers, projet, échéance et cinq statuts.
- Comptes-rendus saisis et conservés avec preuves ; validation explicite nécessaire avant clôture.
- Instructions copiables avec repli sur sélection du texte si le presse-papiers est refusé ; aucun envoi automatique.
- Compteurs manuels, plafond inconnu accepté, date prévue et relevé horodaté ; aucune lecture de l'abonnement ni remise à zéro automatique.
- Missions dans la recherche, synthèse matinale et comptes-rendus du soir.
- Stockage et exports v2 avec migration des données locales et imports v1 ; suppression d'un projet conservant les missions.
- DA écobrutaliste inspirée des références : béton/jardin original, vert forêt, crème, titres sérif et composition éditoriale. Visuel précaché pour le mode hors ligne.

## 0.1.1 — 18 octobre 2026

- Nouvelle direction artistique « Brutalisme zen » : encre, papier minéral, lichen et terre cuite.
- Typographie massive, angles droits, bordures nettes, navigation sombre, formulaires et calendrier harmonisés.
- Cercle ensō vectoriel local, nouvelle marque et icônes PWA coordonnées.
- Identité commune aux cinq espaces sur ordinateur et mobile ; données et fonctions inchangées.

## 0.1.0 — 18 octobre 2026

- Initialisation à partir d'un dépôt vide.
- Interface française responsive avec Accueil, Agenda, Projets, Vie et Explorer.
- Tâches et projets : création, modification, statuts, priorité, échéance, suppression confirmée et progression.
- Agenda mensuel et sélection de journée, filtres, briefings matin/soir locaux et recommandations expliquées.
- Notes/idées modifiables et recherche universelle Ctrl+K.
- IndexedDB versionné, mutations sérialisées et verrou exclusif entre fenêtres.
- Export JSON, validation stricte, aperçu et restauration transactionnelle confirmée.
- PWA hors ligne, icônes locales, projet Android Capacitor généré et synchronisé ; sauvegarde Android automatique désactivée.
- CI GitHub définie ; aucun connecteur, compte ou service payant requis.
- Validation locale : 13 tests Vitest et 8 parcours Playwright réussis ; compilation et synchronisation Capacitor réussies ; audit npm sans vulnérabilité signalée après correction des dépendances.
- Limitations : aucun APK construit ni testé ; pas de santé, sport, nutrition, missions d'assistants ou actualités connectées ; pas de vue hebdomadaire, notifications ni synchronisation.
