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
