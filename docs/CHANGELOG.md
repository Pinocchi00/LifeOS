# Journal des modifications

## 0.7.0 — 19 octobre 2026

- Construction reproductible de l’APK de développement, version Android issue du package, empreinte SHA-256 et clé locale hors Git.
- Plugins officiels pour Retour Android, fichiers, partage et notifications locales. Sauvegardes générales et Vie exportées par le partage Android, sans permission globale de stockage.
- Rappel quotidien facultatif : choix de l’heure, permission après action, essai ponctuel et arrêt explicite. Texte général, programmation approximative, aucune alarme exacte ni envoi distant.
- Retour Android passant par la protection des formulaires, accueil puis arrière-plan ; marges système et icônes natives LifeOS.
- Service worker réservé à la PWA ; ressources natives embarquées et synchronisées avec l’APK. Formats d’organisation v4 et Vie v1 inchangés.
- Tests des adaptateurs natifs, parcours web et scénario instrumenté Android avec CI et artefacts APK/rapports.

## 0.6.0 — 19 octobre 2026

- Explorer réorganisé en Ressources, Apprendre et Idées, avec une création adaptée à la rubrique et accès direct au carnet depuis l’accueil.
- Bibliothèque locale : formats, auteur/organisme, lien HTTP/HTTPS ou référence hors ligne, dates déclarées, annotations, thèmes, favoris et états de lecture.
- Recherche et filtres par source, thème, format, projet, favori et publication ; avertissement de lien déjà conservé, sans téléchargement automatique.
- Actualités manuelles exigeant une date de publication ; aucune collecte temps réel ou vérification de source simulée.
- Idées reliées aux ressources, capture préremplie à confirmer, suppression conservant les autres éléments.
- Parcours d’apprentissage, étapes liées aux ressources, progression cochée et réversible, pause et séances datées avec temps déclaré.
- Historique conservé après renommage/retrait d’étapes ou suppression d’un parcours ; recherche générale des ressources, parcours et séances.
- Enveloppe d’organisation v4 et migrations locales/import v1, v2 et v3 ; sauvegardes Vie indépendantes et inchangées. Export général refusé au-delà de la limite restaurable de 10 Mo.
- Module d’interface Explorer séparé et précaché ; contrôles métier, stockage, parcours navigateur et petits écrans. Erreurs de suppression affichées dans le dialogue.

## 0.5.0 — 19 octobre 2026

- Espace Vie fonctionnel : synthèse du jour, sport, cuisine, habitudes et sommeil, avec date de consultation.
- Séances réalisées, exercices (séries, répétitions et charges), historique comparable et reprise explicite comme modèle.
- Recettes, repas prévus/pris, ajustement des portions et conservation des quantités historiques après modification/suppression d’une recette.
- Stock d’ingrédients, calcul des manquants pour les repas prévus, conversions g/kg et ml/l, courses sans ajout en double et rangement explicite des achats.
- Habitudes datées, réalisation/réouverture, pause et conservation du titre historique ; réalisations futures désactivées.
- Nuits saisies avec début/réveil, durée réelle et ressenti ; moyenne sur les seules nuits enregistrées, sans estimation ni conseil médical.
- Base IndexedDB Vie séparée ; exports et restaurations sélectifs par rubrique, exclus des données générales. Format d’organisation v3 conservé ; nouveau format Vie v1 indépendant.
- Dialogues partagés, protection des formulaires y compris ajout/retrait de lignes, erreurs d’écriture visibles et PWA attendant aussi les écritures Vie.
- Interface Vie chargée séparément, disponible hors ligne après précache ; tests métier, stockage et parcours navigateur dédiés.

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
