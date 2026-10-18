# LifeOS 0.3

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
- Agenda mensuel avec sélection de journée et filtres de tâches ; pas encore de vue hebdomadaire ni de créneaux horaires.
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
- Jardin de travail interactif avec trois terrasses : journée, projets et assistants. La scène est une vraie 3D WebGL locale ; les mêmes commandes restent accessibles dans la vue illustrée.
- Prochaine action calculée sur les données locales, puis mode concentration pour terminer une priorité, passer à la suivante ou rouvrir la dernière tâche.
- Compteurs cliquables, transitions de navigation, survols et confirmations animés. Mode calme persistant et respect prioritaire des animations réduites de l'appareil.
- Avertissement avant fermeture d'un formulaire modifié par Échap, la croix ou le fond du dialogue ; les boutons **Annuler** restent une annulation explicite du formulaire.

## Le jardin de travail

Choisir une terrasse change le contexte du briefing et son action principale. **Journée** reprend les tâches réelles ; **Projets** ouvre vos projets ou propose d'en créer un ; **Assistants** met en avant les missions à vérifier. Les nombres n'influencent pas artificiellement la taille de la scène : ils restent affichés en texte.

Cliquer sur **Explorer en 3D** pour activer le relief. Sur un ordinateur compatible, un survol maintenu peut aussi l'activer. Le visuel original reste la vue de repli si le moteur est indisponible. Sur téléphone, aucun téléchargement 3D n'est déclenché automatiquement. Le glissement vertical reste disponible pour faire défiler la page.

La 3D est téléchargée séparément, à la demande. Elle peut fonctionner hors ligne après un premier chargement réussi sous le contrôle du service worker. Le reste de LifeOS et le jardin illustré restent disponibles hors ligne indépendamment du relief. Les mouvements s'arrêtent au repos et lorsque la scène est masquée ; les ressources sont libérées en quittant l'accueil.

**Me concentrer sur cette tâche** affiche une priorité sans les autres panneaux. Terminer la tâche l'enregistre puis présente la suivante. La dernière clôture peut être annulée dans ce mode ; hors de ce mode, le bouton **Annuler** de la confirmation reste disponible pendant 10 secondes, délai suspendu au survol ou au focus. Une tâche peut toujours être rouverte depuis l'agenda.

Le bouton **Mouvement / Mode calme** suit d'abord les préférences de l'appareil. Le mode calme désactive les animations et garde une 3D fixe si vous l'activez explicitement. La préférence visuelle est enregistrée dans le navigateur, séparément des données métier ; elle n'est pas incluse dans le JSON de sauvegarde.

Les mises à jour PWA sont proposées avec **Mettre à jour**, sans rechargement forcé pendant une saisie. Ce bouton reste inaccessible derrière un dialogue ouvert et attend la fin d'un enregistrement.

L'espace Vie présente les prochaines étapes. Les rapports et chiffres des assistants sont saisis par vous : aucune activité distante, actualité ou intégration IA n'est simulée.

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

Le format de données courant est **v2** : il comprend les missions, rapports et compteurs. Les données locales et sauvegardes **v1** sont migrées sans perdre les tâches, projets ou notes. Les anciennes versions de l'application ne savent pas lire un export v2 ; conserver les exports historiques si nécessaire. Pour charger une mise à jour PWA, fermer toutes les fenêtres LifeOS puis relancer l'application.

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

- `src/domain/` : modèles, règles, missions, validation des sauvegardes et migration v1 → v2.
- `src/components/Assistants.tsx` : centre de missions, formulaires, rapports et compteurs manuels.
- `src/storage/` : IndexedDB et coordination des mutations et fenêtres.
- `src/App.tsx` et les feuilles CSS : écrans, structure responsive et identité écobrutaliste.
- `src/components/DailyGarden.tsx`, `FocusSession.tsx`, `UpdateNotice.tsx` : jardin, concentration et mise à jour explicite.
- `src/experience/` : moteur 3D chargé séparément, préférences de mouvement et cycle PWA.
- `public/` : icônes locales ; aucune police ni image distante.
- `tests/` : parcours Playwright et régressions.
- `android/` : enveloppe Android native générée par Capacitor.
- `docs/` : roadmap, décisions, journal des modifications et vérifications.

Ne jamais ajouter de sauvegardes personnelles, clés, fichiers de santé ou secrets au dépôt. Le code seul est versionné.

Prochain lot dans l'ordre convenu : agenda hebdomadaire, créneaux horaires, routines et objectifs. Ensuite : Vie, Explorer, Android, adaptation et connecteurs facultatifs.
