# Décisions d'architecture

## 001 — Application locale sans backend

React, TypeScript et Vite ; données personnelles uniquement dans IndexedDB de l'origine courante. Aucun appel IA ni synchronisation automatique. Les abonnements des assistants ne sont pas des clés API.

## 002 — Stockage transactionnel

Une enveloppe de données versionnée dans une base IndexedDB `lifeos-core`. Mutations sérialisées et écriture validée avant mise à jour de l'interface. La future santé aura une base distincte ; aucun champ médical n'est créé dans ce lot.

Un verrou Web Locks exclusif est conservé pendant l'ouverture de l'application pour empêcher deux fenêtres d'écraser mutuellement leurs données. La seconde fenêtre demande de fermer la première puis de recharger. Navigateurs récents sur contexte sécurisé (localhost/HTTPS) requis.

## 003 — Restauration explicite

JSON versionné, schéma strict, taille limitée, relations et identifiants contrôlés. Prévisualisation puis confirmation avant remplacement atomique. Le téléchargement préalable d'une sauvegarde est proposé. L'import ne charge aucun code.

## 004 — Petit périmètre complet

Le lot 0.1 implémente tâches, projets, agenda, notes, briefings et sauvegardes. Les espaces Vie et les intégrations assistants affichent honnêtement les prochaines étapes. Aucun projet personnel n'est intégré au code source : les données de démarrage restent dans une sauvegarde locale ignorée par Git et leur import nécessite confirmation.

## 005 — Windows et Android

PWA installable sur navigateur compatible ; Capacitor configuré pour une future application Android native. Ne pas annoncer un APK tant que compilation et essai sur appareil n'ont pas été effectués.

Le projet Android a été généré et synchronisé avec Capacitor 8.4.3. Cette version est fixée précisément : l'audit initial des versions 8.5 signalait une vulnérabilité transitive dans l'outillage iOS. Configuration Capacitor JSON pour éviter l'incompatibilité de son chargeur TypeScript avec TypeScript 7. L'application reste TypeScript.

## 006 — Sauvegardes et installation Android

PWA avec cache des ressources locales, sans contenu distant. Le premier service worker prend le contrôle des pages ouvertes ; une nouvelle version attend la fermeture des anciennes pages. Pas de rechargement automatique qui effacerait un formulaire en cours de saisie.

Sauvegardes cloud Android et transferts automatiques exclus via manifeste et règles d'extraction. IndexedDB et JSON ne sont pas chiffrés par LifeOS ; la protection de session et du disque dépend du système. Aucune synchronisation entre appareils au lot initial.

## 007 — Missions locales et validation

Le lot 0.2 implémente le centre d'assistants comme un registre manuel : aucun connecteur distant ni envoi de message implicite. Les instructions sont du texte à copier, les fichiers sont des références et les comptes-rendus sont saisis explicitement. L'historique des rapports est conservé lors de chaque ajout. Une mission terminée exige un compte-rendu et une validation humaine ; les autres statuts ont une date de validation nulle.

Les preuves HTTP/HTTPS ne sont ouvertes que sur clic ; les autres schémas restent du texte. Les compteurs n'ont aucune valeur initiale supposée, peuvent avoir un plafond inconnu, et ne sont jamais remis à zéro automatiquement. L'échéance d'un compteur est une information déclarée, pas une lecture du fournisseur.

## 008 — Enveloppe v2 et compatibilité

Les nouvelles collections `missions` et `usage` sont ajoutées dans une enveloppe version 2. Le schéma v1 reste strictement accepté puis transformé, en conservant ses trois collections et en initialisant les nouvelles vides. La lecture IndexedDB migre une enveloppe v1 validée ; une donnée invalide n'est jamais remplacée par des données vides. L'import JSON v1 est compatible, l'export est v2. Les identifiants de rapports, les rattachements de missions et les doublons de compteurs sont contrôlés.

## 009 — Écobrutalisme et ressources locales

Les références visuelles fournies orientent la composition et la palette. Un visuel original a été généré avec l'outil intégré ImageGen puis encodé en JPEG sans modification artistique, pour une ressource locale d'environ 600 Ko. Le JPEG est inclus dans le précache PWA pour garder le même rendu hors ligne. Aucune photographie de référence ou couverture n'est copiée dans les sources. Le prompt et le chemin final sont documentés dans `ASSETS.md`.

## 010 — Un jardin qui oriente le travail

La scène représente trois accès fonctionnels, sans inventer de croissance liée à des résultats absents. Un modèle de direction pur choisit l'action principale : première tâche admissible selon la priorité et l'échéance, projets existants, ou missions à vérifier. L'interface HTML reste la source des informations accessibles. Le canvas est décoratif pour les technologies d'assistance et possède des commandes équivalentes en HTML.

## 011 — 3D facultative, à la demande

Three.js est importé dynamiquement. Le chunk du moteur n'entre pas dans le précache initial ; un cache runtime séparé conserve jusqu'à deux versions après chargement. Les données locales et la vue illustrée ne dépendent pas de WebGL. Pas d'autochargement sur téléphone, sur appareil à mouvement réduit, en économie de données, sur connexion 2G déclarée ou sur faible nombre de processeurs logiques ; l'utilisateur peut toujours demander explicitement un relief fixe.

Le moteur dessine sur demande, lisse les changements de caméra puis s'arrête, suspend le rendu hors écran/onglet masqué et libère géométries, matériaux, texture, ombres et contexte à la sortie. Feuilles et tiges sont instanciées. Le ratio de pixels est limité à 1,5 ; les effets et ombres inutiles sont évités. Ce budget ne constitue pas une garantie de fluidité sur tous les appareils.

## 012 — Mouvement et opérations réversibles

Le mouvement indique un changement de contexte ou d'état. Le mode calme suit prioritairement `prefers-reduced-motion` ; aucun effet permanent n'est nécessaire à l'usage. Les transitions de vues sont améliorées progressivement avec l'API native lorsqu'elle existe. Le clavier garde un focus explicite après navigation et changement de priorité.

La dernière modification de réalisation d'une tâche est réversible en mémoire ; les autres mutations invalident cette possibilité pour éviter de réappliquer un état ancien. Le mode concentration conserve cette réouverture pendant sa présence. Les suppressions continuent de demander confirmation. Les formulaires modifiés interceptent les fermetures accidentelles ; annulation et sauvegarde explicites restent disponibles.

## 013 — Mise à jour contrôlée

Le service worker signale une nouvelle version à un petit store d'interface. L'utilisateur déclenche le rechargement avec **Mettre à jour** ; le bouton attend la fin des écritures et reste derrière tout dialogue ouvert. Les préférences de mouvement sont purement visuelles et enregistrées séparément dans le navigateur, sans modifier le schéma v2.


## 014 — Retour au jardin illustré

À la demande de l’utilisateur au lot 0.4, la scène 3D et les dépendances Three.js sont supprimées. Le JPEG original et les trois contextes HTML restent disponibles hors ligne. Le cache `lifeos-relief` des versions précédentes est supprimé au démarrage de la nouvelle version ; aucune donnée métier n’y était stockée. Le mode calme et les transitions utiles restent présents.

## 015 — Planification locale, échéance indépendante

Une tâche possède une échéance facultative et un créneau facultatif `{ day, start, duration }`. Le programme ne déplace pas la date limite lorsqu’un créneau change. La durée est bornée à 5–720 minutes et le créneau doit finir au plus tard à minuit. Les heures sont des heures murales locales de l’appareil ; aucune conversion de fuseau ou calendrier externe n’est annoncée. Les calculs de jour utilisent midi local et l’arithmétique calendaire pour traverser les changements d’heure sans sauter de date.

Les chevauchements entre tâches et routines non terminées sont explicites mais autorisés. Le temps réservé est l’union de leurs intervalles ; il ne double pas les plages superposées, n’inclut pas les éléments terminés et ne représente pas un temps réellement passé. La replanification utilise le formulaire, utilisable au clavier et sur téléphone.

## 016 — Routines calculées et réalisations explicites

Le rythme hebdomadaire est une définition, pas un générateur automatique de tâches. Les occurrences du jour sont calculées selon les jours de semaine et les bornes inclusives. Une réalisation datée, unique pour la paire routine/jour, est créée uniquement après un geste utilisateur ; le futur est refusé. Elle conserve le titre, l’heure et la durée de la définition au moment de l’enregistrement. Modifier ou mettre en pause la routine ne réécrit pas ces faits et les réalisations restent visibles et réversibles.

Les occurrences passées non réalisées suivent la définition actuelle : ce lot ne versionne pas les anciens programmes. Supprimer une routine supprime ses réalisations après confirmation ; la pause est l’alternative proposée pour les conserver. Ces routines sont des repères d’organisation, pas un dossier de santé.

## 017 — Objectifs mesurés par des tâches et enveloppe v3

Un objectif relie des tâches existantes, chacune de même poids. Les réalisations déterminent la progression ; rouvrir une tâche la recalcule, sans état de réussite forcé. Sans étape, la progression est zéro et le résultat n’est pas déclaré accompli. Supprimer une tâche la détache des objectifs, dont le total est recalculé ; supprimer un objectif conserve toutes ses tâches.

L’enveloppe v3 ajoute `routines`, `routineEntries` et `goals`. Le magasin IndexedDB reste le même, car il contient une enveloppe unique. Les lectures v1/v2 sont validées puis transformées en v3 et réécrites en place ; la restauration garde sa confirmation et son écriture atomique. Une enveloppe invalide n’est jamais remplacée par du vide. Les doublons, relations orphelines et heures impossibles sont refusés avant écriture. Les exports v3 ne sont pas lisibles par les applications antérieures ; les anciens exports restent importables.


## 018 — Une base et des sauvegardes distinctes pour Vie

Tous les suivis personnels, y compris sport, cuisine, habitudes et sommeil, sont conservés dans `lifeos-personal`, avec une enveloppe version 1 indépendante de `lifeos-core` v3. Cette base n’est ouverte qu’en entrant dans Vie. L’export général et la recherche générale n’en lisent aucune donnée. Cette séparation limite les inclusions accidentelles ; elle ne chiffre pas les informations et n’isole pas un navigateur compromis ou une session système accessible.

Le verrou global de l’application reste requis. Une file de mutations propre à Vie lit, valide et écrit dans une transaction, sans partir d’un état de composant devenu obsolète. Les écritures survivent à une navigation interne ; la lecture attend les opérations déjà en file. Une donnée incompatible ou un refus d’écriture ne remplace jamais le contenu par du vide. L’avis de mise à jour PWA attend aussi les écritures Vie. Le module d’interface est chargé séparément et précaché pour le hors ligne.

Le format `LifeOS-Vie` propose quatre groupes cohérents : sport ; cuisine/stock/repas/courses ; habitudes/réalisations ; sommeil. L’utilisateur choisit les groupes à exporter, puis à remplacer à l’import. Les groupes non choisis et l’organisation restent intacts. Les relations des habitudes, doublons, tailles et valeurs sont validés avant toute écriture ; le remplacement sélectionné est atomique dans la base Vie. Le format général ne change pas : aucune migration de données d’organisation nécessaire au lot 0.5.

## 019 — Repas et courses sans modification implicite du stock

Un repas conserve un instantané des ingrédients ajustés à ses portions. Les changements de la recette ne réécrivent pas les repas. La liste des manquants agrège tous les repas encore prévus, convertit uniquement les unités de même famille (g/kg, ml/l) et rapproche les noms sans casse ni accents. Aucun synonyme ni conversion poids/volume n’est supposé. Le stock et toutes les lignes de courses déjà présentes, cochées comprises, sont déduits ; une nouvelle demande ne duplique pas le même besoin.

Les lignes existantes ne sont pas diminuées lorsqu’un repas change : leur modification/suppression reste explicite. Cocher un achat marque son état ; `Ranger les achats cochés` réalise une mutation atomique stock/liste. Marquer un repas pris ne déduit pas les réserves automatiquement, car les quantités réellement utilisées peuvent différer. Pas de calories, allergies déduites, recette distante ou conseil nutritionnel inventé.

## 020 — Des traces personnelles, sans estimation médicale

Les séances, réalisations et nuits sont saisies explicitement. Une séance peut être décrite par sa durée seule ou détaillée en séries/répétitions/charges ; les comparaisons rapprochent les exercices de même nom. Reprendre comme modèle préremplit un nouveau formulaire et exige un enregistrement. Les habitudes personnelles sont indépendantes des routines d’organisation. Leur historique garde le titre au moment de la réalisation ; une pause conserve les faits, une suppression confirmée les retire. Les anciens rythmes non réalisés ne sont pas versionnés.

Le sommeil stocke des instants UTC et une date locale de réveil, avec une entrée par nuit et une durée technique maximale de 24 h. Les saisies locales sont contrôlées par aller-retour pour refuser une heure inexistante ; une heure répétée suit le choix de décalage du navigateur. Les heures affichées suivent le fuseau courant. La moyenne ne remplit pas les jours absents avec des zéros. Le lot ne mesure rien en arrière-plan et ne produit ni diagnostic ni recommandation médicale.


## 021 — Explorer dans l’organisation v4

Ressources, parcours et séances d’apprentissage appartiennent à l’organisation, dans la base existante `lifeos-core`. L’enveloppe v4 ajoute `resources`, `learningPaths` et `learningEntries`. Les schémas stricts v1/v2/v3 sont conservés et transformés sans perte ; une enveloppe invalide n’est pas remplacée par du vide. Le magasin IndexedDB reste identique. Les sauvegardes Vie v1 restent indépendantes et ne sont jamais lues par Explorer ou la recherche générale. La limite d’export général correspond désormais à celle de restauration, pour éviter un fichier impossible à réimporter.

Les identifiants globaux incluent les étapes de parcours et les séances. Les liens vers projets, idées, ressources et étapes sont validés avant écriture. Supprimer un projet détache aussi les ressources et parcours, sans les supprimer. L’interface Explorer est chargée séparément et précachée avec les fiches locales, sans mise en cache du contenu externe.

## 022 — Une source retrouvable et des métadonnées déclarées

Une fiche exige un auteur/organisme et soit un lien HTTP/HTTPS sans identifiants, soit une référence hors ligne. Aucun fetch, prévisualisation ou vérification automatique. Les liens sont ouverts uniquement sur action explicite, avec `noopener noreferrer` et une politique sans référent. Les autres protocoles et les identifiants dans les URLs sont refusés.

Les dates sont saisies, et la publication est obligatoire pour le format Actualité. Le statut de lecture n’est pas une preuve d’exactitude. La date de consultation n’est pas déduite d’un clic. La bibliothèque n’est donc pas un flux d’actualité temps réel et ne fabrique aucun fait récent. Le rapprochement de liens ignore uniquement les fragments ; des doublons restent permis pour des usages distincts, avec avertissement. La recherche ignore casse/accents. Les grands résultats sont présentés par lots.

## 023 — Des apprentissages déclarés, un historique conservé

Les étapes sont cochées explicitement et leur progression est réversible. Une lecture terminée et une séance enregistrée ne prouvent pas à elles seules la maîtrise d’une étape. Les minutes sont déclarées, sans chronomètre automatique. La prochaine étape est la première non cochée dans l’ordre défini, pas une recommandation IA.

Les séances conservent un instantané des titres. Renommer un parcours ou retirer une étape ne réécrit pas ces faits. Retirer une étape ou supprimer un parcours détache les séances en conservant leurs annotations et durées. Supprimer une ressource détache les étapes mais garde idées et séances ; supprimer une idée retire son rattachement à la fiche. Créer une idée depuis une ressource prépare un formulaire ; seul l’enregistrement confirme sa création.

## 024 — Android embarqué et sauvegardes choisies

L’APK embarque le résultat compilé ; le service worker ne démarre que sur le web afin d’éviter des ressources anciennes après mise à jour native. IndexedDB et les formats existants sont conservés, dans une origine Android distincte du navigateur. Le bouton Retour passe par l’événement d’annulation du dialogue partagé pour conserver l’avertissement de saisie ; hors dialogue, il revient à l’accueil puis minimise l’application.

Les téléchargements Blob restent adaptés au navigateur. Android écrit un JSON UTF-8 dans un sous-dossier du cache privé, puis ouvre le partage natif avec l’URI de ce fichier. Aucune destination automatique et aucune annonce de sauvegarde réussie après fermeture du partage. Les exports temporaires de plus de 24 h sont nettoyés au prochain export ; le cache n’est pas une sauvegarde durable. Le FileProvider ne donne accès qu’à ce sous-dossier. Vie reste sélectionné et exporté séparément. L’import utilise le sélecteur natif WebView, suivi de la validation et de la confirmation existantes.

## 025 — Des rappels locaux, facultatifs et généraux

Le premier rappel demande un geste explicite ; consulter son état ne demande jamais la permission. L’heure est choisie pour un seul rendez-vous quotidien, avec un essai distinct. La programmation du système est la source de l’état affiché ; elle n’est pas incluse dans les sauvegardes et ne contient aucun suivi Vie ni intitulé de tâche. L’arrêt annule uniquement les deux identifiants réservés à LifeOS et retire leurs notifications livrées.

Le plugin utilise explicitement des alarmes non exactes ; la permission d’alarme exacte apportée par sa dépendance est retirée du manifeste fusionné. Aucun contournement de veille ni serveur de notification. Le système peut retarder la livraison, ce que l’interface annonce. Une défaillance native reste visible, sans prétendre que le rappel fonctionne. Les préférences explicables plus avancées restent en phase 6.


## 026 — Une adaptation explicite, sans apprentissage caché

Les priorités du briefing et de la concentration partagent le nombre choisi (1 à 5) et l’ordre choisi (priorité/échéance ou échéance/priorité). Les tâches disponibles gardent leur définition ; les égalités suivent création puis identifiant. Aucun changement des tâches, dates ou suivis Vie. Le jardin annonce l’ordre actif. Le mode calme reste un choix de l’appareil, les notifications restent gérées par Android.

Les conseils utilisent six règles déterministes ordonnées, calculées uniquement sur l’organisation. Chaque proposition expose règle, version, chiffres et limites. Le seuil de charge correspond au nombre de priorités choisi, sans estimer la disponibilité humaine. « Pas aujourd’hui » écarte une règle pour la date locale ; le jour suivant la rend de nouveau éligible. « Utile » ne change ni règle ni réglage. Un retour conserve la proposition, sa raison et ses preuves au moment du choix. Une réponse à une proposition devenue obsolète est refusée ; une annulation conserve sa trace. Le masquage durable exige un changement explicite des préférences.

## 027 — Configurations réversibles et décisions relisibles

Le premier changement conserve aussi la configuration de départ. Chaque révision porte un motif et un instantané. Restaurer ajoute une révision référant à la version choisie, après prévisualisation et confirmation. Aucun historique n’est tronqué silencieusement : la limite de 500 bloque les nouveaux changements et propose export puis effacement explicite. Effacer garde les réglages actifs dans un nouveau point de départ ; les anciennes configurations deviennent inaccessibles dans l’application.

Le carnet est une mémoire saisie volontairement, avec recherche propre ; le texte n’est pas indexé par la recherche générale ni utilisé pour les conseils. La date de relecture est un repère sans notification. L’édition remplace le texte ; des choix successifs se consignent dans des entrées distinctes. Les retours (5 000) et décisions (2 000) ont des limites explicites, et les longues listes sont affichées par lots. Les horodatages dépendent de l’appareil et les JSON restent éditables : ce n’est pas un journal certifié.

L’enveloppe d’organisation v5 ajoute `adaptation` à `lifeos-core`, sans nouveau magasin. Les schémas stricts v1 à v4 sont conservés, validés et enrichis uniquement avec les valeurs de départ ; les lectures réécrivent le nouveau format. Les révisions, leurs références, les réglages actifs, les identifiants et les retours actifs par règle/date sont contrôlés avant écriture ou restauration. Les imports remplacent aussi les réglages et le carnet, ce que le récapitulatif annonce. Vie v1 demeure indépendante et n’est jamais ouverte pour ces calculs. Les erreurs métier dans la file de mutations reviennent au formulaire ; une erreur de stockage garde aussi l’alerte globale.


## 028 — GitHub public à la demande, sans secret client

Le premier connecteur lit uniquement une issue, une PR ou une exécution Actions identifiée par son URL. L’ajout d’un lien, l’ouverture, le rechargement, les instructions et la restauration restent locaux. Seul le bouton de lecture effectue un GET vers `api.github.com`, sans authentification, cookies, corps ni référent ; le navigateur peut effectuer un précontrôle CORS. L’adresse IP et le chemin public sont transmis. Aucune création, modification, fusion ou relance sur GitHub.

Les URL HTTPS GitHub.com directes sont validées et normalisées, sans identifiants, paramètres, fragments, ports alternatifs ou chemins arbitraires. L’API est construite à partir des segments validés ; aucune URL reçue du serveur n’est suivie pour un nouvel appel. Les redirections sont refusées. L’identité HTML et le numéro de la réponse doivent correspondre à la référence attendue. Les champs utiles sont projetés dans un schéma strict, sans corps/commentaire/avatar/HTML rendu ni liens distants ajoutés. Les titres sont du texte React et les instructions ne reprennent que les URL validées.

La lecture est annulable et bornée à 15 secondes. Les réponses sont limitées à 1 Mio avant projection, avec annulation du flux si possible ; les erreurs ne remplacent pas les relevés. Les limites 403/429 établissent une attente dans la session, sans répétition automatique. Les ressources privées et GitHub Enterprise ne sont pas accessibles par ce connecteur. Une authentification future exige un serveur sécurisé ; aucun champ de clé client n’est ajouté.

## 029 — Des preuves datées, sans validation automatique

Chaque relevé conserve date de lecture, date distante déclarée et titre ; PR : état, fusion, brouillon et commit ; Actions : statut, conclusion éventuellement inconnue/absente, commit et tentative. Une fermeture n’est pas une fusion ; un succès ne vaut que pour cette exécution. Une nouvelle lecture ne réécrit pas les anciennes. Un relevé n’est pas un état temps réel et ne prouve pas à lui seul les critères d’une mission. Le statut local et les comptes-rendus restent indépendants.

L’enveloppe v6 ajoute `githubLinks` à `lifeos-core` : référence à une mission et au plus 20 relevés, 10 liens par mission, 2 000 au total. Les types, références, doublons et identifiants globaux sont validés avant écriture. Atteindre la limite bloque les nouvelles lectures ; l’effacement explicite conserve seulement le dernier relevé. Retirer un lien efface ses relevés ; supprimer une mission retire aussi ses liens. L’export général comprend ces informations, sans consulter Vie. L’import ne démarre aucune connexion. La migration v5 ajoute uniquement la liste vide et préserve les préférences/historiques ; les schémas v1 à v4 restent importables.

## 030 — Serveur privé facultatif en boucle locale

La base locale reste autonome. Le serveur Node 24 sert uniquement le build et un protocole API restreint sur 127.0.0.1, sans proxy distant ou CORS. Le fournisseur n’est pas choisi par le client : seul api.github.com est autorisé, en GET sans redirection. Un jeton personnel limité et une liste exacte de dépôts sont fournis au processus par l’opérateur ; la saisie Windows est masquée et sans fichier. Les identifiants ne passent jamais dans le build Vite, le stockage métier ou une réponse HTTP. Le serveur ne lit aucune base IndexedDB, mission ou donnée Vie.

Un code aléatoire de 128 bits valable dix minutes ouvre au plus une session après cinq essais incorrects au maximum. La consommation est vérifiée après lecture du corps pour éviter les doubles appairages concurrents. Le cookie HttpOnly SameSite strict limité au chemin API désigne un secret de session de 256 bits expirant après une heure, révocable ; code/session/quota restent en mémoire. Vérification de session répétée après lecture du corps, pour ne pas contacter GitHub après révocation. Origine et hôte exacts, marqueur dédié, en-têtes de proxy et cross-site refusés ; aucune confiance ajoutée aux extensions ou processus de l’ordinateur. Ce modèle HTTP en boucle locale ne constitue pas une architecture de déploiement distant ; Android privé et HTTPS nécessitent un lot distinct.

Le choix de transport est explicite et revient au public à chaque ouverture du panneau. Vérifier le serveur et appairer ne lisent aucun dépôt. Une requête ne transmet que la cible stricte ; le serveur projette la réponse avec les mêmes schémas que la lecture publique, contrôle son identité et exclut corps/commentaires/auteurs. Une lecture externe à la fois, cadence minimale d’une seconde, soixante tentatives par heure, attentes GitHub, taille et délais bornés, révocation et fermeture HTTP annulent le fournisseur. Aucun réessai, écriture GitHub ou changement automatique de mission. Les erreurs externes brutes ne sont ni affichées ni journalisées.

Les instantanés partagent le format v6 existant, sans ajouter d’accès ou secret aux sauvegardes. Les titres, URL et états privés restent volontairement dans l’organisation en clair ; les instructions copiées incluent ses URL. La provenance du transport n’est pas conservée dans ce format et n’est pas présentée comme une certification. Changer d’origine exige export/restauration explicite de l’organisation et, séparément, de Vie. Le cache PWA n’intercepte pas les navigations API et aucune réponse privée n’est mise en cache HTTP ; les relevés demandés sont enregistrés seulement dans IndexedDB. Aucun appel IA ou coût n’est introduit.

## 031 — Une autorisation bornée pour un brouillon OpenAI

Les API restent facultatives, sur le serveur local 127.0.0.1 existant, avec appairage/sessions et contrôle d’origine/hôte conservés. OpenAI est le seul fournisseur de ce lot, sur les missions ChatGPT. Un catalogue daté limite le modèle à GPT-5.6 Terra, avec sources/tarifs et date de fin bloquante ; aucun modèle ou prix libre fourni par le navigateur. La clé et les deux limites sont fournies explicitement au processus, jamais à Vite ou à une base client.

L’aperçu est construit localement au serveur après préparation explicite, sans appel fournisseur, lié au seul texte éditable et à sa limite de sortie. Le navigateur compare la requête exacte. Un aperçu par session, deux minutes, remplacé par le suivant et consommable une seule fois après confirmation. Les consignes ne promettent aucun accès ou action ; fichiers, rapports, GitHub et Vie ne sont pas repris. L’envoi autorisé transmet d’abord modèle/consignes/texte au comptage Responses, puis génère seulement si les entrées restent sous 20 000 jetons et le coût de précaution sous la réserve. Sortie bornée à 1 024 jetons, outils absents, store/background/stream désactivés, service standard et troncature refusée. Révocation, expiration de session, délai et fermeture HTTP tentent d’arrêter le fournisseur, sans prétendre annuler sa facturation. Aucun réessai et attente 429 respectée.

## 032 — Registre de réservations conservateur et durable

SQLite intégré à Node, transactions immédiates, WAL et synchronous FULL. Format de registre 1 et limite de dix mille lignes, aucun effacement automatique. Une autorisation réserve durablement 0,10 USD et un essai avant tout appel fournisseur. La réserve reste consommée après succès, erreur, interruption ou état inconnu ; les jetons retournés ne la remboursent pas. Les limites quotidiennes, par jour UTC, bornent les réservations de LifeOS, pas la facture totale du compte. Le tarif de précaution majore l’entrée de 25 % pour couvrir les écritures de cache aux prix documentés. Les taxes et évolutions de prix restent extérieures à cette estimation.

Le registre contient uniquement identifiant aléatoire, jour, réserve et état technique. Ni clé, texte ni réponse. Son dossier .local-server est exclu de Git/build/APK/exports métier. Les sessions et aperçus restent en mémoire ; les réservations survivent aux redémarrages et transactions concurrentes. Une erreur, un verrou, une version future ou un retour de l’horloge bloque sans réinitialisation. La sauvegarde de ce registre exige arrêt du serveur et copie du dossier complet ; restaurer une copie ancienne peut perdre la connaissance de dépenses récentes et impose rapprochement fournisseur. Le système de fichiers de l’opérateur reste une frontière de confiance.

## 033 — Adoption explicite dans les comptes-rendus existants

Une réponse est un brouillon textuel, jamais du code exécuté. Statut incomplet/refus, usage déclaré, identifiant, modèle, date, estimation et réserve sont affichés. L’adoption explicite ajoute un compte-rendu marqué non vérifié ; elle ne change ni statut ni validation. Le schéma strict v6 existant suffit, sans nouvelle migration ou mélange avec Vie. La copie/export est en clair et ne certifie pas les résultats du modèle. Un identifiant déjà adopté dans la mission est refusé. L’aperçu exact n’est pas archivé dans ce format ; avant adoption, la réponse ne vit que dans l’onglet. Le dialogue et le rechargement protègent une demande modifiée, un aperçu ou un brouillon non conservé. Le serveur n’archive pas de conversation et aucun historique n’est automatiquement réinjecté.

## 034 — Un catalogue explicite et un budget commun aux fournisseurs

Le lot 0.12 ajoute Sonnet 5.5 et Haiku 5.5 aux missions Claude, sans changer le format de données. Les clés OpenAI et Anthropic sont facultatives indépendamment, avec les mêmes deux limites explicites et le même registre SQLite de format 1. Changer de fournisseur ou redémarrer avec d’autres clés ne crée pas de compteur neuf. Les statuts exposent uniquement la disponibilité des fournisseurs, jamais leurs clés. Une indisponibilité ou erreur ne provoque aucun remplacement de modèle.

Le modèle fait partie de la requête validée et de son aperçu immuable. Le navigateur compare les paramètres, interdit un changement dans l’aperçu actif et demande un nouvel accord après retour au texte. Les endpoints et en-têtes fournisseurs sont déterminés côté serveur ; seuls trois identifiants datés sont acceptés. Le comptage et la génération utilisent les paramètres propres au modèle, sans outils, fichiers ou cache Anthropic demandé. Les réponses avec blocs non textuels, cache inattendu, modèle, rôle, identifiant, usage ou arrêt incompatibles sont refusées ; les erreurs et clés des deux fournisseurs sont filtrées.

La réserve reste volontairement fixe à 0,10 USD, commune à tous les modèles, distincte de l’estimation issue de leurs tarifs sourcés. Les tarifs Haiku retenus concernent les prompts sous 100 000 jetons ; LifeOS limite l’entrée à 20 000. Les sources sont datées et expirent après trente jours. L’adoption choisit la source du modèle, vérifie son fournisseur contre l’assistant de la mission et conserve statut/validation. Les essais utilisent uniquement des fournisseurs fictifs ; aucun accès réel ou absence de rétention n’est annoncé.

## 035 — HTTPS direct et appairage d’un seul propriétaire

Le lot 0.13 conserve le serveur HTTP uniquement en boucle locale et ajoute une configuration TLS complète et explicite. Le processus sert le web et les API à la même origine, sans CORS ni proxy HTTP de confiance. Origine/port exacts, adresse d’écoute réseau volontaire, TLS 1.2 minimum, nom SAN, dates et clé contrôlés au démarrage. Les chemins réels des fichiers TLS doivent rester hors build/public et les erreurs ne divulguent pas les fichiers. La confiance publique et le renouvellement du certificat appartiennent à l’opérateur ; un nom dédié évite le partage de cookies avec une autre application.

Le mécanisme personnel existant est repris : un seul code temporaire, une session maximale d’une heure, révocation commune GitHub/IA, cookie Secure/HttpOnly/Strict à préfixe __Secure en HTTPS. Il n’est pas présenté comme un compte multiutilisateur ou un accès natif Android. Aucun hébergement n’est disponible dans cette session ; le logiciel est testé en boucle locale avec TLS réel et fournisseurs fictifs, sans ouvrir de port public ni installer de certificat de confiance. L’APK conserve le mode manuel/public. Le raccordement natif privé est la prochaine étape logicielle.

Le changement d’origine ne transfère rien : les stockages de navigateur et de l’APK restent distincts. Le format v6, Vie, les aperçus à accord unique, réservations durables et absence de réessai sont conservés. Déconnexion et arrêt révoquent la session sans effacer les relevés ou brouillons adoptés ; aucune donnée métier n’est hébergée ni synchronisée. Le guide précise exploitation, identité personnelle, limites de l’appairage et sauvegarde du registre.
