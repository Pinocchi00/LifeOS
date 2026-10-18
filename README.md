# LifeOS 0.1

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

Les espaces Vie et Assistants expliquent les prochaines étapes. Aucun suivi santé, rapport d'assistant, quota, actualité ou connecteur n'est simulé.

## Sauvegarder et restaurer

Ouvrir l'avatar en haut à droite ou **Données & sauvegardes** sur ordinateur. Choisir **Exporter mes données**. Conserver le JSON dans un endroit sûr : il contient vos informations en clair, sans chiffrement.

Pour restaurer : sélectionner un JSON LifeOS, vérifier le nombre d'éléments puis confirmer le remplacement. Exporter d'abord les données actuelles : la restauration remplace l'intégralité du contenu, elle ne fusionne pas les appareils. Les fichiers inconnus, trop volumineux (10 Mo), incohérents ou de version non prise en charge sont refusés avant toute écriture.

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

- `src/domain/` : modèles, règles, validation des sauvegardes et tests métier.
- `src/storage/` : IndexedDB et coordination des mutations et fenêtres.
- `src/App.tsx`, `src/styles.css` : écrans et interactions accessibles.
- `public/` : icônes locales ; aucune police ni image distante.
- `tests/` : parcours Playwright et régressions.
- `android/` : enveloppe Android native générée par Capacitor.
- `docs/` : roadmap, décisions, journal des modifications et vérifications.

Ne jamais ajouter de sauvegardes personnelles, clés, fichiers de santé ou secrets au dépôt. Le code seul est versionné.

Prochain lot recommandé : centre de missions ChatGPT/Claude avec critères, statuts, preuves, copie d'instructions et quotas saisis manuellement.
