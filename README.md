# LifeOS 0.4

Votre organisation personnelle, privée et locale. Premier lot fonctionnel en français : React, TypeScript, Vite et IndexedDB. Aucun compte, abonnement ou service IA nécessaire.

## Démarrer sur Windows

Prérequis : Node.js 22.12+ ou 24+, npm, Edge ou Chrome récent.

Dans PowerShell :

```powershell
cd E:\LifeOS
npm.cmd ci
npm.cmd run dev
```

Ouvrir l'adresse affichée, normalement `http://127.0.0.1:5173`. Garder le terminal ouvert. Arrêter avec Ctrl+C.

Pour une version compilée, installable et utilisable hors ligne après son premier chargement :

```powershell
npm.cmd run build
npm.cmd run preview -- --port 4173 --strictPort
```

Ouvrir `http://127.0.0.1:4173`, puis choisir **Installer LifeOS** dans le menu du navigateur si proposé. Le mode hors ligne de la PWA est activé en version compilée, pas dans le serveur de développement.

**Conserver la même adresse** pour retrouver les mêmes données : `localhost`, `127.0.0.1`, les différents ports, les autres profils de navigateur et l'application Android ont des stockages distincts. Une seule fenêtre de LifeOS peut écrire à la fois ; fermer la première puis recharger la seconde.

## Ce qui fonctionne

- Cinq espaces responsive et navigation Android avec barre inférieure.
- Tâches : création, modification, échéance, priorité, rattachement à un projet, réalisation/réouverture et suppression confirmée.
- Agenda semaine/mois avec sélection de journée, créneaux horaires indépendants des échéances, avertissements de chevauchement et filtres de tâches.
- Routines hebdomadaires, réalisations datées et pause ; objectifs à étapes liées aux tâches, progression réelle et réversible.
- Projets : création, modification, statut, couleur, progression calculée sur les tâches. Suppression confirmée en conservant les tâches.
- Accueil calculé : trois priorités, tâches du jour, projets actifs, progression, idées et conseils locaux expliqués.
- Briefings matin/soir à partir des tâches réelles ; le bilan utilise la date locale de réalisation.
- Idées : capture, modification, suppression, carnet Explorer et recherche commune aux tâches/projets/idées (Ctrl+K).
- Persistance IndexedDB, export JSON, contrôle des fichiers importés et restauration transactionnelle avec confirmation.
- PWA et projet natif Android Capacitor généré et synchronisé.
- Centre ChatGPT/Claude dans **Projets → Missions IA** et **Mes assistants** sur ordinateur : objectifs, critères, fichiers, échéance, cinq statuts, comptes-rendus et preuves conservés.
- Instructions copiables ; clôture d'une mission après compte-rendu et validation explicite. Aucun message n'est envoyé automatiquement.
- Compteurs d'usage manuels pour les deux assistants : plafond facultatif, date de remise à zéro prévue, date du relevé et notes. Aucun accès aux abonnements ni remise à zéro automatique.
- Missions recherchables et synthèse dans les briefings du matin et du soir.
- Identité écobrutaliste : béton et jardin original, vert forêt, crème et typographie éditoriale. Tous les visuels sont locaux et disponibles hors ligne.
- Jardin de travail illustré avec trois contextes : journée, projets et assistants. La 3D a été retirée ; les actions contextuelles et le visuel original sont conservés.
- Prochaine action calculée sur les données locales, puis mode concentration pour terminer une priorité, passer à la suivante ou rouvrir la dernière tâche.
- Compteurs cliquables, transitions de navigation, survols et confirmations animés. Mode calme persistant et respect prioritaire des animations réduites de l'appareil.
- Avertissement avant fermeture d'un formulaire modifié par Échap, la croix ou le fond du dialogue ; les boutons **Annuler** restent une annulation explicite du formulaire.

## Le jardin de travail

Choisir une terrasse change le contexte du briefing et son action principale. **Journée** reprend les tâches réelles ; **Projets** ouvre vos projets ou propose d'en créer un ; **Assistants** met en avant les missions à vérifier. Les nombres n'influencent pas artificiellement la taille de la scène : ils restent affichés en texte.

Le jardin fonctionne entièrement en HTML et CSS, sans WebGL ni téléchargement de moteur 3D. Son image locale est disponible hors ligne après le premier chargement de la PWA.

**Me concentrer sur cette tâche** affiche une priorité sans les autres panneaux. Terminer la tâche l'enregistre puis présente la suivante. La dernière clôture peut être annulée dans ce mode ; hors de ce mode, le bouton **Annuler** de la confirmation reste disponible pendant 10 secondes, délai suspendu au survol ou au focus. Une tâche peut toujours être rouverte depuis l'agenda.

Le bouton **Mouvement / Mode calme** suit d'abord les préférences de l'appareil. Le mode calme désactive les animations de l’interface. La préférence visuelle est enregistrée dans le navigateur, séparément des données métier ; elle n'est pas incluse dans le JSON de sauvegarde.

Les mises à jour PWA sont proposées avec **Mettre à jour**, sans rechargement forcé pendant une saisie. Ce bouton reste inaccessible derrière un dialogue ouvert et attend la fin d'un enregistrement.

L'espace Vie présente les prochaines étapes. Les rapports et chiffres des assistants sont saisis par vous : aucune activité distante, actualité ou intégration IA n'est simulée.

## Planifier sa semaine

Dans **Agenda**, choisir **Semaine** ou **Mois**, puis un jour. Les flèches déplacent la période ; **Aller au jour** et **Revenir à aujourd’hui** permettent de se repérer rapidement.

- Une **échéance** est une date limite. Un **créneau** est le moment réservé au travail : jour, heure et durée de 5 à 720 minutes, avec une fin au plus tard à minuit. Les deux sont indépendants. Une tâche peut avoir l’un, l’autre, les deux ou aucun.
- **Planifier une tâche** ouvre un créneau au jour sélectionné. Dans toute tâche, **Attribuer un créneau** permet de l’ajouter ou de le retirer. Modifier son jour ou son heure permet de la reprogrammer, sans duplication.
- Le programme affiche les créneaux, les routines et les échéances du jour. Les chevauchements entre engagements non terminés sont signalés et restent autorisés. Le temps réservé mesure leur union, sans double comptage ; les engagements terminés et les routines sans heure en sont exclus.
- Les horaires sont des heures locales de l’appareil, sans conversion de fuseau ni synchronisation d’un calendrier externe. Les créneaux traversant minuit sont à découper en deux tâches.

Dans **Routines**, créer un rythme hebdomadaire : jours, date de début, fin facultative, heure facultative et durée. Les occurrences sont calculées à l’affichage ; aucun doublon de tâche n’est créé. Cocher une routine enregistre seulement ce jour. Les jours futurs ne peuvent pas être réalisés à l’avance. Le passé peut être renseigné explicitement ou rouvert.

Modifier un rythme ou le mettre en pause conserve les réalisations, leur titre et leur horaire historiques. Les anciennes occurrences non réalisées suivent le rythme actuellement configuré : ce n’est pas un historique versionné des programmes. Supprimer une routine demande confirmation et supprime aussi ses réalisations ; utiliser la pause pour conserver cet historique. Les 30 réalisations les plus récentes sont visibles ; l’export conserve toutes les réalisations.

Dans **Objectifs**, définir un résultat et lui associer des tâches existantes ou **Ajouter une étape**. Chaque tâche compte pour une étape de même poids. La progression suit les statuts réels et diminue si une étape est rouverte. Sans étape, aucun résultat accompli n’est annoncé. Une tâche supprimée est détachée des objectifs et le total est recalculé. Supprimer un objectif conserve ses tâches. Routines et objectifs sont aussi accessibles par la recherche universelle et inclus dans les sauvegardes.

## Utiliser les assistants

1. Ouvrir **Projets**, puis **Missions IA**, et créer une mission pour ChatGPT ou Claude.
2. Définir l'objectif, les critères de réussite, le projet et les fichiers concernés.
3. Ouvrir **Instructions**, copier le texte puis le coller dans l'assistant choisi. Joindre vous-même les fichiers utiles.
4. Revenir dans LifeOS, modifier la mission et coller le compte-rendu réel ainsi que les preuves ou références. Les comptes-rendus précédents sont conservés.
5. Passer à **À vérifier**, puis **Terminé** après vérification des critères et confirmation de votre validation. Une mission sans compte-rendu ne peut pas être terminée.

Les liens de preuve HTTP/HTTPS sont cliquables ; les chemins de fichiers et autres références restent du texte. La suppression d'un projet conserve ses tâches et missions, sans rattachement. La suppression confirmée d'une mission supprime aussi ses comptes-rendus.

Les compteurs affichent uniquement votre dernier relevé. Si un plafond est inconnu, aucun nombre restant n'est inventé. Une date de remise à zéro passée invite à vérifier les chiffres ; elle ne déclenche aucune modification. Pour commencer une nouvelle période, modifier l'usage relevé et la date prévue.

## Sauvegarder et restaurer

Ouvrir l'avatar en haut à droite ou **Données & sauvegardes** sur ordinateur. Choisir **Exporter mes données**. Conserver le JSON dans un endroit sûr : il contient vos informations en clair, sans chiffrement.

Pour restaurer : sélectionner un JSON LifeOS, vérifier le nombre d'éléments puis confirmer le remplacement. Exporter d'abord les données actuelles : la restauration remplace l'intégralité du contenu, elle ne fusionne pas les appareils. Les fichiers inconnus, trop volumineux (10 Mo), incohérents ou de version non prise en charge sont refusés avant toute écriture.

Le format de données courant est **v3** : il ajoute les créneaux, routines, réalisations et objectifs. Les données locales et sauvegardes **v1 et v2** sont validées puis migrées sans perdre leur contenu. Les anciennes versions de l’application ne savent pas lire un export v3 ; conserver les exports historiques si nécessaire. Pour charger une mise à jour PWA, fermer toutes les fenêtres LifeOS puis relancer l'application.

Le stockage n'est pas une sauvegarde garantie : le nettoyage des données du navigateur, la navigation privée, une désinstallation ou une réinitialisation peuvent l'effacer. Aucune synchronisation cloud ni chiffrement applicatif dans cette version. Les données santé ne sont pas encore prises en charge ; leur stockage séparé est prévu.

## Tests

```powershell
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
npm.cmd audit
```

Playwright lance le serveur compilé sur le port 4173 : laisser ce port libre pour tester la compilation courante. Tests Chromium sur ordinateur et format Pixel 7 ; le format Android est une émulation de navigateur, pas un essai natif sur téléphone. Captures locales dans `test-results/`, exclues de Git.

## Android

Le dossier `android/` est prêt pour Android Studio. Installer Android Studio, son SDK et un JDK compatible avec la version Gradle du projet, puis :

```powershell
npm.cmd run android:sync
npx.cmd cap open android
```

Construire et essayer l'application sur un appareil ou un émulateur depuis Android Studio. Aucun APK validé n'est livré dans ce lot : JDK/SDK Android absents de l'environnement de développement. Les téléchargements de sauvegardes et sélecteurs de fichiers doivent encore être vérifiés dans la WebView native. Les sauvegardes cloud Android et transferts automatiques sont désactivés dans le manifeste ; utiliser l'export explicite.

Sur un téléphone, `127.0.0.1` désigne le téléphone, pas le PC. Pour installer la PWA sur Android, il faudra une origine HTTPS accessible au téléphone ; aucun hébergement n'est configuré ici. Préférer le projet Capacitor pour poursuivre les essais locaux natifs.

## Structure

- `src/domain/` : modèles, règles, missions, validation des sauvegardes et migrations v1/v2 → v3.
- `src/components/Assistants.tsx` : centre de missions, formulaires, rapports et compteurs manuels.
- `src/storage/` : IndexedDB et coordination des mutations et fenêtres.
- `src/App.tsx` et les feuilles CSS : écrans, structure responsive et identité écobrutaliste.
- `src/components/DailyGarden.tsx`, `FocusSession.tsx`, `UpdateNotice.tsx` : jardin, concentration et mise à jour explicite.
- `src/components/Planning.tsx`, `PlanningForms.tsx` : semaine, mois, routines, objectifs et formulaires.
- `src/domain/planning.ts`, `planningSchema.ts` : calculs calendaires, créneaux, réalisations et validation.
- `src/experience/` : préférences de mouvement et cycle PWA.
- `public/` : icônes locales ; aucune police ni image distante.
- `tests/` : parcours Playwright et régressions.
- `android/` : enveloppe Android native générée par Capacitor.
- `docs/` : roadmap, décisions, journal des modifications et vérifications.

Ne jamais ajouter de sauvegardes personnelles, clés, fichiers de santé ou secrets au dépôt. Le code seul est versionné.

Prochain lot dans l’ordre convenu : Vie (sport, nutrition, recettes et habitudes), avec une séparation explicite des données de santé. Ensuite : Explorer, Android, adaptation et connecteurs facultatifs.
