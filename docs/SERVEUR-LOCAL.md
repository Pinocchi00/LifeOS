# Serveur privé facultatif — LifeOS 0.10

Le serveur sert la version web compilée de LifeOS et ajoute la lecture d’issues, PR et exécutions Actions de dépôts privés **GitHub.com** autorisés. Il écoute uniquement sur **127.0.0.1**, sur cet ordinateur. Il ne synchronise pas les données et ne publie aucun service sur le réseau. L’application locale et l’APK restent autonomes.

Depuis les lots 0.11 et 0.12, ce même serveur peut aussi héberger les [connecteurs OpenAI et Anthropic facultatifs](API-IA.md). Depuis le lot 0.13, un [mode HTTPS personnel distinct](SERVEUR-HTTPS.md) est disponible avec une origine et un certificat explicitement configurés. Sans cette configuration, les restrictions locales de ce guide restent applicables. Ce guide décrit la lecture GitHub ; les règles de transmission de texte et de réservations IA figurent dans le guide dédié.

## Démarrage sur Windows

Node.js **24.12 minimum**, npm et Chrome/Edge récent. Dans `E:\LifeOS` :

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd run connector:setup
```

Le dernier script demande les dépôts autorisés (`proprietaire/depot`, séparés par des virgules), puis le jeton avec une saisie masquée. Il le transmet au seul processus serveur par variable d’environnement et restaure l’environnement à l’arrêt. Il n’écrit pas de fichier de clés, de journal HTTP ou de commande contenant le jeton. La commande autorise ce script pour le seul processus PowerShell lancé, sans changer la politique globale du poste. Garder le terminal ouvert ; Ctrl+C arrête le serveur et invalide la session. Le système d’exploitation et les processus ayant les droits de l’utilisateur restent une frontière de confiance.

Le terminal affiche `http://127.0.0.1:4317` et un **code d’appairage** généré au démarrage, à usage unique, valable dix minutes. Ce code autorise une session locale ; ce n’est pas le jeton GitHub. Ouvrir cette adresse directement dans le navigateur. Dans Projets → Missions IA → Références GitHub :

1. Relier une URL GitHub.com directe ; cette étape reste locale.
2. Choisir **Privé, par mon serveur** et lire les informations de confidentialité.
3. Choisir **Vérifier le serveur local**, puis saisir le code du terminal et appairer le navigateur. Ces actions ne contactent pas GitHub.
4. Choisir **Vérifier et garder un relevé** sur la référence voulue. Seuls dépôt, type et numéro sont envoyés au serveur. Lui seul contacte GitHub, en lecture seule.
5. Examiner le relevé puis les critères de la mission. Sa validation reste manuelle.

Une installation/PWA ou un autre onglet peut bénéficier de la session du même profil et de la même adresse ; la session est partagée, mais une seule fenêtre LifeOS peut écrire. **Déconnecter le serveur** révoque la session pour tous ces onglets. Il faut redémarrer le serveur pour obtenir un nouveau code après déconnexion, expiration du code ou de la session, ou cinq essais incorrects.

## Retrouver ses données

Les ports 5173, 4173 et 4317, `localhost`, `127.0.0.1`, les profils et l’APK ont des stockages distincts. **Avant de changer d’adresse**, exporter l’organisation et, séparément depuis Vie, les rubriques personnelles à transférer. Restaurer explicitement ces fichiers sur la nouvelle adresse. Rien n’est copié ni supprimé automatiquement sur l’ancienne adresse. Garder ensuite la même adresse et le même port.

Les titres privés, URL et états lus sont stockés en clair dans IndexedDB et la sauvegarde d’organisation v6. Les instructions copiées d’une mission incluent les URL des références. **Déconnecter n’efface pas ces relevés**, consultables hors ligne ; leur retrait local passe par les confirmations habituelles. Le format v6 reste identique : les relevés n’indiquent pas si leur lecture provenait du serveur ou de l’API publique. Le code d’appairage, le cookie et le jeton ne sont ni dans les sauvegardes ni dans Vie. Aucun texte de mission, compte-rendu ou suivi Vie n’est transmis au serveur.

## Préparer le jeton GitHub

Créer un **personal access token à permissions fines** pour son usage personnel, avec une expiration courte, limité aux seuls dépôts voulus. Accorder les droits **Issues: read**, **Pull requests: read** et **Actions: read** selon les références à consulter ; Metadata est associé par GitHub. Aucun droit d’écriture n’est nécessaire. Une organisation peut exiger approbation ou autorisation supplémentaire. La liste du serveur est une restriction additionnelle : elle n’accorde aucun droit au jeton.

Ne pas saisir le jeton dans LifeOS, dans une URL, un argument de commande, un fichier suivi par Git ou une variable `VITE_*`. En cas de fuite, révoquer le jeton dans GitHub, en créer un autre et redémarrer le serveur. Aucun jeton réel n’est fourni ou configuré par le dépôt.

Références officielles consultées le 19 octobre 2026 : [protection des identifiants](https://docs.github.com/en/rest/authentication/keeping-your-api-credentials-secure), [permissions des jetons à droits fins](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens?apiVersion=2026-03-10), [création et gestion d’un jeton](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).

## Autres systèmes et configuration existante

`npm run connector:start` lance directement le serveur avec les variables de son environnement. Utiliser une saisie masquée ou un gestionnaire de secrets pour fournir `LIFEOS_GITHUB_TOKEN`, sans inscrire la clé littéralement dans l’historique du terminal. `LIFEOS_GITHUB_REPOSITORIES` est une liste exacte d’au plus cent `owner/repo`, séparés par des virgules, insensible à la casse. Jeton et liste doivent être configurés ensemble ; sinon le démarrage est refusé. Sans les deux, LifeOS web démarre avec l’accès privé désactivé, sans appel réseau.

`LIFEOS_CONNECTOR_PORT` permet un port entre 1024 et 65535 (4317 par défaut). Il ne change jamais l’adresse d’écoute. Ce serveur n’accepte pas de proxy, de nom de domaine alternatif, de configuration CORS, de cible arbitraire ou d’hôte GitHub Enterprise. Le code de fixture `scripts/connector-fixture.mjs` est réservé aux tests : il ne charge pas de clé utilisateur et ses réponses sont fictives ; ne pas l’utiliser pour des données réelles.

## Protections et limites

- Appairage de 128 bits, comparaison de hachages en temps constant, durée de dix minutes, usage unique et cinq échecs au plus. Session aléatoire de 256 bits, expirant après une heure sans prolongation automatique, révocable. Rien de cet état ne survit au redémarrage du serveur.
- Cookie `HttpOnly`, `SameSite=Strict`, limité à `/api/connector`. HTTP est accepté **uniquement en boucle locale** ; ce serveur n’est pas un déploiement HTTPS distant et ne doit pas être exposé par un tunnel ou une redirection de port. Le mode HTTPS personnel possède sa configuration dédiée depuis 0.13 ; l’accès natif Android privé reste à développer.
- Hôte exact contrôlé, en-têtes de proxy refusés, origine exacte pour les POST, marqueur de requête requis, accès cross-site refusé, aucun CORS ouvert. CSP sur la version servie, interdiction d’intégration en iframe et de chargement de code tiers. Seuls les fichiers compilés sont servis ; dotfiles, sources, clés et source maps sont exclus.
- Cibles strictes, dépôts en liste autorisée, seul GET vers `https://api.github.com` avec version `2026-03-10`, aucune redirection. Le jeton n’est pas renvoyé au navigateur. Les erreurs distantes et corps non projetés ne sont pas transmis ou journalisés.
- Une lecture externe à la fois, une seconde entre départs, soixante tentatives au plus par heure de fonctionnement, attente GitHub respectée et aucun réessai automatique. Annulation à la fermeture de la requête ou à la déconnexion, délai externe de quinze secondes, JSON externe limité à 1 Mio, corps entrant à 4 Kio. Les quotas locaux et attentes ne sont pas durables ; redémarrer ne réinitialise pas les quotas imposés par GitHub. Une tentative échouée consomme aussi la limite locale.
- Les relevés sont des instantanés déclarés par GitHub. Aucun changement de statut de mission, écriture GitHub, exécution de contenu, tâche automatique, appel IA ou dépense n’est réalisé.

## Vérifier sans identifiants

```powershell
npm.cmd test
npm.cmd run test:server
npm.cmd run build
npm.cmd run test:e2e
```

Les tests serveur ouvrent de vraies connexions HTTP en boucle locale avec un fournisseur remplacé explicitement. Les parcours de navigateur servent le vrai build avec cette même frontière réseau simulée. Ils ne démontrent pas l’accès réel à un dépôt privé ni une configuration HTTPS/Android distante. Les tests natifs continuent à vérifier l’usage embarqué hors ligne et le parcours public avec réponse fictive.
