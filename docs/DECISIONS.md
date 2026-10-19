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
