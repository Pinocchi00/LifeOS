# Connexions facultatives — GitHub public, lot 0.9

LifeOS reste utilisable hors ligne. Ce lot ajoute une lecture publique volontaire pour les références des missions ; il ne crée pas de compte, ne stocke aucun jeton et ne modifie rien sur GitHub.

## Utiliser une référence

1. Ouvrir Projets → Missions IA, puis Références GitHub sur une mission.
2. Relier une URL directe d’issue, de pull request ou d’exécution Actions. Cette étape est locale.
3. Lire l’explication réseau puis choisir **Vérifier et garder un relevé**. La lecture et sa conservation sont une seule action volontaire. Fermer le panneau annule la lecture encore en cours ; un relevé dont l’écriture a déjà commencé peut être conservé.
4. Relire l’état, la date, le commit et la tentative. Vérifier les critères puis valider la mission manuellement si nécessaire.

Formats acceptés, avec les segments à remplacer :

- `https://github.com/OWNER/REPO/issues/42`
- `https://github.com/OWNER/REPO/pull/42`
- `https://github.com/OWNER/REPO/actions/runs/123456`

Les URL doivent être directes, sans paramètre ni fragment. Le propriétaire et le dépôt sont insensibles à la casse. Pour une PR présentée à l’API des issues, LifeOS demande d’utiliser son URL `/pull/`. Un dépôt déplacé peut nécessiter son nouveau lien, car les redirections API ne sont pas suivies.

## Ce que signifie le relevé

Les dates et états sont ceux déclarés par l’API au moment de la lecture. « Fermée » ne veut pas dire « fusionnée ». Le commit d’une PR décrit sa branche source ; celui d’une exécution peut être un commit de fusion ou un autre événement. LifeOS ne les rapproche pas automatiquement et ne présente jamais une exécution comme la totalité des contrôles d’une PR. Les conclusions inconnues ou absentes restent explicitement indiquées.

Ouvrir le lien consulte le site GitHub dans un autre onglet. Les instructions copiables reprennent les références, sans envoyer les consignes ni le texte de la mission. Aucun appel API n’a lieu à l’ouverture de LifeOS, du panneau, d’un historique ou d’une sauvegarde.

## Réseau et erreurs

La lecture transmet à GitHub le chemin public et l’adresse IP du réseau. `fetch` utilise GET, `credentials: omit`, `referrerPolicy: no-referrer`, `cache: no-store`, `redirect: error`, un contrôleur d’annulation et la version API `2026-03-10`. Le navigateur peut émettre un précontrôle CORS. Aucun serveur intermédiaire LifeOS ni proxy de contournement.

Le quota public non authentifié est associé à l’adresse IP, généralement **60 requêtes par heure** ; d’autres outils sur le même réseau peuvent le consommer. Les erreurs 404 ne permettent pas de distinguer un lien absent d’une ressource privée. Une erreur, un refus, une annulation, un délai de 15 secondes ou une réponse incompatible conserve le dernier relevé. La temporisation indiquée par GitHub bloque de nouvelles lectures dans la session et n’effectue aucun réessai ; recharger l’application réinitialise cet état temporaire, pas le quota distant. Une absence d’en-tête exploitable lors d’un 429 entraîne une attente minimale d’une minute.

Les réponses doivent être du JSON et ne pas dépasser 1 Mio. Seuls titre, dates et états utiles sont conservés. Le contenu des issues, commentaires, fichiers, journaux, auteurs et images n’est ni enregistré ni exécuté.

## Sauvegarde et limites

Les références et leurs relevés sont dans l’organisation v6. Vie reste indépendante. L’import v5 conserve les réglages et leurs versions, puis ajoute une liste de références vide ; les imports v1 à v4 restent pris en charge. Restaurer une sauvegarde remplace les références locales sans aucune lecture distante.

Limites : dix liens par mission, deux mille au total, vingt relevés par lien. Aucun relevé ancien n’est supprimé silencieusement. Exporter l’organisation avant d’effacer ; **Effacer les anciens relevés** conserve le dernier. Retirer un lien ou supprimer sa mission retire ses relevés après confirmation. Les JSON restent en clair et éditables ; les dates dépendent de l’appareil, ce n’est pas un journal certifié.

## Ce qui reste à développer

Dépôts privés, GitHub Enterprise, authentification et synchronisation en écriture nécessitent un connecteur côté serveur et des droits configurés explicitement. Les connecteurs IA, budgets, catalogue de modèles et automatisations ne sont pas simulés par cette lecture publique. Aucun service payant ni secret n’a été configuré dans ce lot.

Références officielles : [issues](https://docs.github.com/en/rest/issues/issues#get-an-issue), [pull requests](https://docs.github.com/en/rest/pulls/pulls#get-a-pull-request), [exécutions Actions](https://docs.github.com/en/rest/actions/workflow-runs#get-a-workflow-run), [CORS](https://docs.github.com/en/rest/using-the-rest-api/using-cors-and-jsonp-to-make-cross-origin-requests), [limites de lecture publique](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api).
