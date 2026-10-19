# LifeOS sur Android

## Installer l’APK de développement

Le lot 0.13 produit `artifacts/LifeOS-0.13.0-debug.apk` et son empreinte `.sha256`. Copier le fichier sur le téléphone, l’ouvrir et autoriser la source d’installation lorsque le système le demande. Android 7/API 24 est le minimum déclaré ; un Android System WebView récent reste nécessaire aux fonctions web de l’application. Cette version n’est pas une publication Play Store et n’a pas de clé de production.

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

La compilation et le lint locaux sont décrits dans `VERIFICATION.md`. La CI ajoute un émulateur Android 15/API 35 isolé et publie l’APK de développement avec les rapports pendant 14 jours. Le scénario teste le stockage après rechargement hors réseau, Retour avec saisie, modification explicite d’une préférence avec historique, présence de ces réglages dans le JSON v6, partage réel du JSON, restauration par résultat du sélecteur Android, programmation et annulation de rappels, et réception d’une notification d’essai. Le scénario GitHub utilise une réponse HTTP fictive déclarée dans la WebView hors réseau : il vérifie la lecture volontaire, le relevé et l’export v6 sans valider l’accès réel à GitHub depuis un téléphone. La lecture publique réelle est vérifiée séparément dans Chromium. Le choix d’un fournisseur de fichiers est simulé ; la copie vers chaque application de destination n’est pas automatisée.

La recette sur téléphone physique, les politiques de batterie propres aux fabricants, le redémarrage du téléphone, les changements de fuseau/heure d’été, les appareils anciens et lecteurs d’écran réels restent à vérifier. Les parcours Playwright Pixel 7 sont des tests web distincts, pas une validation native. La distribution avec signature de production et publication sur un store restent hors de ce lot.

## Connecteur privé 0.10

Le mode HTTP privé s’utilise dans le navigateur de l’ordinateur qui l’exécute. Depuis le lot 0.13, le [serveur HTTPS personnel](SERVEUR-HTTPS.md) permet aussi un accès par navigateur à une origine correctement hébergée ; il ne raccorde pas l’APK. Dans l’APK, le choix privé explique cette limite et ne contacte aucun serveur ; revenir à **Public, sans compte** pour une lecture publique. Aucun HTTP en clair ni clé fournisseur n’est ajouté à Android. Les relevés privés importés dans l’organisation restent consultables hors ligne et sont inclus en clair dans ses exports.

## API IA 0.12

L’APK affiche la limite des connecteurs OpenAI et Anthropic, disponibles dans le navigateur du serveur local ou HTTPS configuré. Il n’offre aucune saisie de clé ou envoi IA natif. Les instructions manuelles restent disponibles. Les brouillons adoptés comme comptes-rendus peuvent être transférés par export/restauration de l’organisation v6 et relus hors ligne, en clair. Aucun secret ou registre de dépenses serveur n’est embarqué.

Le parcours natif 0.12 ouvre aussi une mission Claude, vérifie les deux modèles du catalogue et l’absence de commande d’accès serveur dans l’APK. Il ne simule pas une génération native.
