# LifeOS sur Android

## Installer l’APK de développement

Le lot 0.15 produit `artifacts/LifeOS-0.15.0-debug.apk` et son empreinte `.sha256`. Copier le fichier sur le téléphone, l’ouvrir et autoriser la source d’installation lorsque le système le demande. Android 7/API 24 est le minimum déclaré ; un Android System WebView récent reste nécessaire aux fonctions web de l’application. Cette version n’est pas une publication Play Store et n’a pas de clé de production.

L’installation Android possède son propre stockage. Pour transférer des informations depuis Windows : exporter l’organisation et, séparément, les rubriques Vie souhaitées ; copier les fichiers ; les restaurer dans l’APK après lecture du récapitulatif. Une restauration remplace les rubriques annoncées, sans fusion entre appareils. Exporter les données courantes avant tout remplacement.

Une mise à jour avec la même clé et un numéro de version supérieur peut garder le stockage existant. La clé de développement locale se trouve dans `.tools/keys/lifeos-debug.keystore`, hors Git. La conserver pour reconstruire des mises à jour compatibles. Une clé différente, notamment celle d’un runner CI, ne permet pas de remplacer directement une installation locale signée autrement. Ne pas désinstaller une version contenant des données sans avoir exporté et vérifié ses sauvegardes. La clé de développement et son mot de passe standard ne conviennent pas à une distribution de production.

## Fonctions natives

- Les fichiers web sont embarqués dans l’APK. Aucun serveur Vite ou premier téléchargement PWA n’est requis pour ouvrir LifeOS hors ligne. Aucun service worker n’est enregistré dans Android : la version affichée suit les ressources installées avec l’APK.
- Retour Android ferme d’abord le dialogue en passant par la protection des saisies. Le clavier système peut d’abord se fermer. Depuis une rubrique, Retour revient à l’accueil ; depuis l’accueil, il place l’application en arrière-plan. Les formulaires non enregistrés ne sont pas persistés après arrêt du processus.
- La navigation native applique le changement de rubrique directement, sans attendre l’API View Transitions de la WebView. Les transitions CSS et le mode calme restent disponibles ; le navigateur Windows conserve son propre effet de changement de page.
- Exporter ouvre le partage Android avec un fichier JSON UTF-8. Choisir une application capable de conserver un fichier ou l’emplacement proposé par le système. La fermeture du partage n’est pas une preuve d’enregistrement. Les copies temporaires restent dans le cache privé `lifeos-exports/` ; celles de plus de 24 h sont nettoyées au prochain export, sous réserve d’accès au cache. Le système peut aussi purger ce cache : il ne constitue jamais une sauvegarde durable.
- Le fournisseur de fichiers ne partage que ce sous-dossier. Aucune permission générale de lecture/écriture du stockage n’est demandée. Le sélecteur de restauration donne accès au seul fichier choisi ; le schéma et la limite de taille sont contrôlés avant écriture.
- Les rappels se règlent dans **Données & sauvegardes → Votre rendez-vous quotidien**. La consultation ne demande pas la permission ; les boutons Activer/Tester la demandent. Un rappel existant est remplacé à identifiant stable. Le bouton Désactiver annule le quotidien et l’essai, puis retire leurs notifications affichées. Une permission refusée ne supprime pas les données d’organisation.
- Les notifications ne contiennent que du texte général. Le canal est privé sur l’écran verrouillé, sans vibration ajoutée. Aucune alarme exacte, demande d’exception de batterie, notification distante, clé Firebase ou compte n’est nécessaire. Les livraisons peuvent être retardées par Android, la veille, un espace privé verrouillé ou les réglages du téléphone. Une application forcée à l’arrêt peut ne plus notifier jusqu’à sa réouverture. Le rappel suit l’heure locale gérée par Android ; vérifier l’heure affichée après changement de fuseau ou d’heure système.
- L’état affiché des rappels est lu depuis le système à l’ouverture du panneau et au retour au premier plan. Ce réglage est propre à l’appareil, hors des JSON d’organisation et Vie.

Les sauvegardes cloud et transferts automatiques Android restent exclus dans le manifeste et les règles d’extraction. Le stockage applicatif et les JSON ne sont pas chiffrés par LifeOS. Le partage n’envoie rien sans votre choix ; une application de destination peut utiliser son propre service réseau.

## Reconstruire

Prérequis : Node 22.12+/24+, npm, JDK 21, SDK Android API 36 et Build Tools. Android Studio peut fournir ces outils. Pour une autre machine, définir `JAVA_HOME` et `ANDROID_HOME` vers les installations. Sur ce poste, le script détecte automatiquement `.tools/jdk/` et `.tools/android-sdk/`, sans installation Java globale.

```powershell
cd E:\LifeOS
npm.cmd ci
npm.cmd run android:verify
```

Le script compile le web, synchronise Capacitor, crée une clé de développement locale si absente, construit l’APK, lance le lint et compile l’APK de tests. `android:build` construit seulement l’APK. Les versions Android sont dérivées de `package.json` ; `versionCode = major × 10000 + minor × 100 + patch`. Les caches Gradle, outils, clés, APK et données d’essai sont exclus de Git.

Pour travailler dans Android Studio : `npm.cmd run android:sync`, puis `npx.cmd cap open android`. Pour les essais connectés après construction : `cd android`, puis `./gradlew :app:connectedDebugAndroidTest` (Windows : `gradlew.bat`). La CI installe directement les deux APK compilés avec ADB, puis lance `AndroidJUnitRunner` et exige son résultat `OK` ; elle évite une seconde résolution des dépendances du lanceur Gradle. Ces essais utilisent un profil d’émulateur de test, jamais un appareil contenant des données réelles.

Sources techniques : [environnement Capacitor 8](https://capacitorjs.com/docs/getting-started/environment-setup), [notifications locales](https://capacitorjs.com/docs/apis/local-notifications), [partage](https://capacitorjs.com/docs/apis/share), [fichiers](https://capacitorjs.com/docs/apis/filesystem), [retour et cycle de vie](https://capacitorjs.com/docs/apis/app), [AndroidJUnitRunner](https://developer.android.com/training/testing/instrumented-tests/androidx-test-libraries/runner).

## Recette et limites

La compilation et le lint locaux sont décrits dans `VERIFICATION.md`. La CI ajoute un émulateur Android 15/API 35 isolé et publie l’APK de développement avec les rapports pendant 14 jours. Le scénario teste la replanification locale avec aperçu, consentement, Retour protégé, journal persistant et annulation, puis le stockage après rechargement hors réseau, Retour avec saisie, modification explicite d’une préférence avec historique, présence de ces réglages dans le JSON v7, partage réel du JSON, restauration par résultat du sélecteur Android, programmation et annulation de rappels, et réception d’une notification d’essai. Le scénario GitHub utilise une réponse HTTP fictive déclarée dans la WebView hors réseau : il vérifie la lecture volontaire, le relevé et l’export v7 sans valider l’accès réel à GitHub depuis un téléphone. La lecture publique réelle est vérifiée séparément dans Chromium. Le choix d’un fournisseur de fichiers est simulé ; la copie vers chaque application de destination n’est pas automatisée.

La recette sur téléphone physique, les politiques de batterie propres aux fabricants, le redémarrage du téléphone, les changements de fuseau/heure d’été, les appareils anciens et lecteurs d’écran réels restent à vérifier. Les parcours Playwright Pixel 7 sont des tests web distincts, pas une validation native. La distribution avec signature de production et publication sur un store restent hors de ce lot.

## Connecteurs privés 0.14

L’APK peut désormais enregistrer une origine HTTPS et appairer un accès personnel à GitHub privé, OpenAI et Anthropic. La session reste en mémoire Java, sans cookie, clé fournisseur ou secret dans le JavaScript. Le serveur doit être en version 0.14 ou plus récente ; son certificat doit être reconnu normalement par Android. Aucun HTTP local ou contournement TLS n’est activé. Suivre [ANDROID-HTTPS.md](ANDROID-HTTPS.md) pour le parcours et les limites.

Les instructions manuelles et la lecture publique restent disponibles sans serveur. L’adresse du serveur est propre à cet appareil, hors des JSON. Les relevés privés et comptes-rendus adoptés restent consultables hors ligne et sont exportés en clair dans l’organisation v7, séparément de Vie. Aucune synchronisation automatique.

La recette native historique est conservée. Un second profil d’essai vérifie le raccordement HTTPS réel avec des fournisseurs fictifs ; la confiance de fixture est injectée par le seul APK de test après avoir observé le refus du client normal. Aucun domaine, hébergement ou appel fournisseur réel n’est configuré par le dépôt.


## Automatisations locales 0.15

Dans **Agenda → Automatisations**, replanifier les créneaux passés après sélection, aperçu et consentement. Le journal est conservé dans l’organisation v7 et permet un retour groupé si les tâches n’ont pas changé. Fonctionne hors ligne, sans serveur ni notification automatique. Voir [AUTOMATISATIONS.md](AUTOMATISATIONS.md).
