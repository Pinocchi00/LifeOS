# Serveur HTTPS personnel — LifeOS 0.13

Le serveur peut servir LifeOS et ses connecteurs GitHub/IA à une **origine HTTPS unique**, avec un certificat et une clé fournis par son propriétaire. Le navigateur utilise cette même origine pour l’application et les API ; aucun secret fournisseur n’est intégré au web ou à l’APK. Le mode HTTP reste limité à `127.0.0.1`.

Ce lot fournit le logiciel et une recette locale avec fournisseurs fictifs. **Aucun domaine, hébergement, certificat de production ou service public n’est configuré sur ce poste.** Depuis 0.14, l’[accès natif privé dans l’APK](ANDROID-HTTPS.md) utilise ce serveur HTTPS, avec une session distincte du cookie web. Un navigateur mobile peut utiliser le site HTTPS une fois réellement hébergé ; son stockage reste distinct de celui de l’APK.

## Préparer une installation réelle

Il faut un hôte maintenu avec Node.js **24.12 minimum**, un nom dédié pointant vers lui et un certificat reconnu par les navigateurs pour ce nom. L’opérateur fournit la chaîne PEM (certificat du site en premier, puis intermédiaires) et la clé PEM correspondante, sans phrase secrète interactive. Les fichiers doivent être lisibles uniquement par le compte de service et les administrateurs. Utiliser des chemins absolus hors de `dist/` et `public/`, par exemple dans `.local-server/tls/`, dossier exclu de Git. Ne jamais utiliser la paire publique de `server/test-fixtures/tls/` pour une installation réelle.

Le processus termine lui-même TLS : **aucun proxy HTTP ou terminaison TLS intermédiaire n’est pris en charge**. Les en-têtes `Forwarded` et `X-Forwarded-*` contrôlés sont refusés, sans confiance implicite envers un proxy. Un éventuel équipement de transport TCP doit conserver le port et l’origine externes attendus. Ne pas exposer le serveur HTTP local par un tunnel. L’ouverture des ports, DNS, droits d’écoute, sauvegarde et supervision appartiennent à l’hébergement choisi ; les scripts ne les modifient pas.

Le démarrage vérifie le nom SAN du certificat, ses dates, la correspondance de la clé et la validité des paramètres TLS. Cela ne prouve pas la confiance publique de sa chaîne : le navigateur doit accepter le certificat normalement, **sans ignorer son avertissement**. TLS 1.2 minimum ; HSTS d’une journée, sans sous-domaines ni préchargement. Voir [HTTPS Node.js](https://nodejs.org/download/release/latest-v24.x/docs/api/https.html), [TLS Node.js](https://nodejs.org/download/release/latest-v24.x/docs/api/tls.html) et les [recommandations TLS MDN](https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/TLS).

## Lancement Windows

Compiler d’abord avec `npm.cmd ci` puis `npm.cmd run build`. Exemple **à adapter à un domaine et des fichiers réellement possédés**, sans clé fournisseur dans la commande :

```powershell
npm.cmd run connector:https-setup -- -Origin "https://lifeos.example.net:8443" -CertificateFile "E:\LifeOS\.local-server\tls\fullchain.pem" -KeyFile "E:\LifeOS\.local-server\tls\key.pem" -BindAddress "0.0.0.0" -Configure GitHub
```

`-Configure GitHub` réutilise la saisie masquée du jeton et la liste exacte des dépôts du [guide local](SERVEUR-LOCAL.md). `-Configure AI` réutilise la saisie masquée des fournisseurs et des limites communes du [guide IA](API-IA.md). `Environment`, valeur par défaut, utilise les accès déjà fournis au processus par un gestionnaire de secrets. Le script ne stocke pas les clés et restaure ses variables temporaires à l’arrêt. Les configurations GitHub et IA peuvent coexister dans l’environnement conformément aux deux guides.

`127.0.0.1` est l’adresse d’écoute par défaut, y compris en HTTPS ; **seul un choix explicite** de `0.0.0.0` (IPv4) ou `::` (IPv6, comportement double pile dépendant du système) permet une écoute réseau. Les règles réseau de l’hôte restent nécessaires. Le port indiqué dans l’origine est le port du processus : 443 sans port explicite, 8443 dans l’exemple. Un port privilégié nécessite les droits appropriés ; ne pas lancer l’application avec un compte administrateur pour contourner un mauvais choix d’hébergement.

Sur un autre système, ou avec des accès déjà configurés, fournir ces variables au processus puis exécuter `npm run connector:start` :

- `LIFEOS_REMOTE_ORIGIN` : origine canonique HTTPS seule, sans barre finale, chemin, identifiant, requête ou fragment.
- `LIFEOS_TLS_CERT_FILE` et `LIFEOS_TLS_KEY_FILE` : deux chemins absolus distincts. Fichiers réguliers de 2 Mio au plus chacun ; les liens sont résolus avant le contrôle des dossiers publics.
- `LIFEOS_BIND_ADDRESS` : l’une des trois adresses ci-dessus, facultative.
- `LIFEOS_CONNECTOR_PORT` : à omettre ; si définie, doit correspondre exactement au port de l’origine HTTPS.

Une configuration partielle est refusée ; elle ne provoque aucune écoute HTTP de remplacement. Sans les trois variables TLS, le lancement habituel reste local. Aucune variable `VITE_*` ne doit recevoir de secret. Ne pas enregistrer une clé fournisseur littéralement dans une commande ou un fichier suivi.

## Appairer son navigateur

Ouvrir directement l’adresse exacte affichée par le terminal. Dans une mission, choisir **Privé, par mon serveur → Vérifier ce serveur HTTPS**, puis saisir le code du terminal. Le bouton de vérification IA permet le même appairage. Vérifier l’origine affichée avant d’utiliser le code.

Le serveur est **personnel, pour un seul propriétaire** : code aléatoire de 128 bits, valable dix minutes, à usage unique, cinq erreurs au plus ; une session de 256 bits valable une heure au maximum. Ce code donne accès aux connecteurs configurés : ne le transmettre qu’au navigateur voulu, par un canal de confiance, et protéger les journaux du terminal. Il n’existe pas de comptes multiples, de récupération de compte ou de SSO/OIDC dans ce lot. Un hébergement partagé à plusieurs utilisateurs exige une autre gestion d’identité.

Le cookie `__Secure-lifeos_connector` est `Secure`, `HttpOnly`, `SameSite=Strict`, limité au chemin `/api/connector`, sans domaine élargi. Le préfixe exige HTTPS ; il ne sépare pas les ports ni ne transforme le chemin en frontière de sécurité. Utiliser un nom dédié sans autre application non fiable. Voir [Set-Cookie MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie).

L’appairage ne lit aucun dépôt et n’envoie aucun texte à un fournisseur. Une lecture GitHub se demande référence par référence ; l’IA exige toujours son aperçu exact et son consentement. **Déconnecter le serveur** révoque la session GitHub et IA pour tous les onglets de ce profil à cette adresse. Redémarrer révoque aussi la session et donne un nouveau code après expiration ou déconnexion ; aucun renouvellement silencieux. Le budget SQLite durable n’est pas remis à zéro. Un essai interrompu reste réservé selon le guide IA.

## Données, maintenance et limites

Les données restent dans le stockage de chaque navigateur. **Une nouvelle origine n’a pas les données du PC ou de l’APK** : exporter l’organisation et Vie séparément depuis l’ancienne installation puis restaurer explicitement sur la nouvelle adresse. Aucun compte, synchronisation ou fusion distante n’est créé. Les relevés et brouillons adoptés restent consultables hors ligne après déconnexion. Le JSON conserve ces textes en clair ; il ne contient ni code, cookie, clé TLS, clé fournisseur ou registre serveur. La base Vie reste séparée. Depuis le lot 0.15, le format général v7 inclut aussi le journal des automatisations locales ; sa restauration ne rejoue aucune action.

Le serveur charge le certificat au démarrage. Prévoir son renouvellement et un redémarrage avant expiration ; aucun renouvellement automatique ni émission ACME n’est fourni. Pour sauvegarder le registre de dépenses, arrêter le serveur puis copier l’ensemble du dossier selon le guide IA ; restaurer une vieille copie exige un rapprochement avec le fournisseur. Protéger aussi les secrets et les sauvegardes du compte de service ; ils ne doivent pas être ajoutés au dépôt ni aux ressources statiques.

Les contrôles d’hôte/origine, absence de CORS, limites de corps/délais, liste de dépôts autorisés, filtrage des réponses et absence de réessai sont conservés. L’application web servie reste publique à cette adresse ; seules les API privées exigent une session, et les données métier ne sont pas hébergées. Le plafond de cinq erreurs d’appairage peut imposer un redémarrage après des tentatives malveillantes. Ce mécanisme n’est pas une protection générale contre le déni de service ; le filtrage réseau et l’exploitation de l’hôte restent nécessaires à une mise en ligne réelle.

## Recette reproductible, sans hébergement

`npm run test:server` exécute de vraies connexions TLS avec la paire artificielle publique de test, une confiance explicitement limitée et des fournisseurs fictifs. Les erreurs de confiance/nom, HTTP clair, fichiers TLS, cookies, origines, expiration, révocation et aperçu/budget sont vérifiés. `npm run build` puis `npm run test:e2e -- tests/https.spec.ts` lancent le même parcours HTTPS dans Chromium ordinateur et Pixel 7, puis export et rechargement hors ligne. Les serveurs de test écoutent uniquement en boucle locale ; l’exemption SPKI du navigateur de test ne concerne que leur clé artificielle. Aucun contournement TLS n’est ajouté à l’application, au serveur de production ou à l’APK. Voir les résultats effectivement obtenus dans [VERIFICATION.md](VERIFICATION.md).

## Client Android 0.14

Le serveur accepte aussi une session personnelle de type Android, obtenue par le même code à usage unique, exclusivement sur HTTPS. Une session autorise soit le navigateur soit le client natif ; son secret ne peut pas être réutilisé dans l’autre transport. Le client natif ne reçoit aucun cookie et son jeton de session reste en mémoire Java. Aucun CORS ni origine WebView n’est ajouté aux accès web. La révocation, les délais, les budgets et les consentements restent communs ; le client exige le marqueur de protocole du serveur 0.14. Voir [ANDROID-HTTPS.md](ANDROID-HTTPS.md).
