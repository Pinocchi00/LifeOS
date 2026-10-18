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
