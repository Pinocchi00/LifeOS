# API IA facultative — LifeOS 0.12

Les missions ChatGPT peuvent demander un brouillon à **OpenAI**, les missions Claude à **Anthropic**, depuis le navigateur de l’ordinateur qui exécute le serveur LifeOS. Le lot 0.12 ajoute Claude et son choix de modèle. Il produit un brouillon textuel ; il ne dispose d’aucun outil pour agir, lire un fichier ou consulter GitHub. L’IA native Android et le déploiement distant restent à développer. Aucun compte, clé réelle ou appel payant n’est configuré par le dépôt.

## Démarrer sur Windows

Node.js **24.12 minimum**, npm et navigateur récent. Après avoir préparé une clé API OpenAI ou Anthropic de votre propre projet :

```powershell
cd E:\LifeOS
npm.cmd ci
npm.cmd run build
npm.cmd run connector:ai-setup
```

Le script demande le fournisseur (OpenAI, Anthropic ou les deux), deux limites communes et chaque clé choisie en saisie masquée. Les clés des fournisseurs non choisis ne sont pas reprises de l’environnement pendant ce lancement. Elles sont transmises au processus serveur, sans fichier de clés ni clé dans les arguments/historiques de commande. L’environnement est restauré à l’arrêt. L’autorisation du script PowerShell concerne son processus, sans modifier la politique globale du poste.

- Limite quotidienne commune aux fournisseurs : **0.10 à 10 USD**, avec point décimal.
- Nombre d’essais quotidien commun : **1 à 100**, par jour UTC.
- Chaque essai autorisé consomme une **enveloppe de précaution fixe de 0,10 USD**, conservée même si la réponse échoue, est interrompue, se perd ou n’est pas adoptée. Ce montant n’est pas présenté comme le prix réellement facturé. Par exemple, 0.30 USD et 5 essais autorisent au plus trois essais.

Ouvrir l’adresse affichée, normalement `http://127.0.0.1:4317`, puis Projets → Missions IA → **Préparer une demande API**. Le code d’appairage du terminal n’est pas votre clé API. Il autorise une session locale d’une heure, partagée avec le connecteur GitHub de ce même serveur. Les conditions et protections du [serveur local](SERVEUR-LOCAL.md) restent applicables.

Pour fournir des secrets depuis un gestionnaire existant, le serveur accepte `LIFEOS_OPENAI_KEY` et/ou `LIFEOS_ANTHROPIC_KEY`, ainsi que `LIFEOS_AI_DAILY_USD` et `LIFEOS_AI_DAILY_CALLS` dans l’environnement, puis `npm run connector:start`. Au moins une clé et les deux limites communes doivent être configurées ensemble. Le même registre est conservé lors d’un changement de fournisseur. Elles peuvent coexister avec les variables GitHub ; le script de saisie IA n’ajoute pas de jeton GitHub. Utiliser un seul serveur au port choisi. Ne jamais placer une clé dans `VITE_*`, une URL, une mission, un export ou un fichier suivi par Git.

Les adresses et ports ont des stockages distincts. Exporter l’organisation et, séparément, Vie avant de changer d’adresse ; restaurer explicitement sur l’adresse du serveur. Aucun transfert automatique entre Windows, PWA et APK.

## Préparer et autoriser

1. **Vérifier l’accès IA du serveur** : cette action consulte uniquement LifeOS local. Appairer le navigateur si nécessaire.
2. Relire et modifier **Texte à transmettre**. Seuls titre, objectif et critères de la mission sont proposés au départ. Fichiers, rapports précédents, liens GitHub, autres missions, projets et Vie ne sont pas repris automatiquement. Le texte fourni manuellement peut naturellement contenir des informations personnelles : il faut le relire.
3. Choisir le modèle proposé pour cet assistant, puis 256, 512 ou 1 024 jetons de sortie, raisonnement compris. Le choix reste local ; aucun catalogue distant n’est interrogé. La demande est limitée à 6 000 caractères ; rien n’est tronqué silencieusement.
4. **Préparer l’aperçu sans envoyer à [fournisseur]** transmet au seul serveur local le texte, le modèle et la limite. Il construit une requête immuable, valable deux minutes, remplaçant le précédent aperçu. Le navigateur vérifie sa correspondance avec la demande. À cette étape, aucun appel fournisseur ni réservation quotidienne.
5. Examiner la requête exacte, les consignes, le fournisseur, les limites et la politique de données. Cocher l’autorisation, puis **Autoriser et envoyer à [fournisseur]**. Cette confirmation couvre le comptage puis la génération et l’enveloppe réservée. Aucune transmission au fournisseur avant cette action.

Le serveur réserve d’abord l’enveloppe dans son registre durable. Il transmet ensuite le modèle, les consignes et le texte à `POST https://api.openai.com/v1/responses/input_tokens`. Si le comptage est invalide ou dépasse 20 000 jetons d’entrée, il ne lance pas la génération. Sinon il appelle une fois `POST https://api.openai.com/v1/responses` avec la requête approuvée. Pour Claude, le comptage utilise `POST https://api.anthropic.com/v1/messages/count_tokens`, puis la génération `POST https://api.anthropic.com/v1/messages`, avec `x-api-key` et `anthropic-version: 2023-06-01` ajoutés exclusivement côté serveur. Le comptage reçoit modèle, système, message utilisateur, configuration du raisonnement et absence d’outils ; l’aperçu montre séparément cette requête et celle de génération. La documentation décrit le comptage Anthropic comme gratuit, mais LifeOS conserve sa réserve conservatrice dès la première transmission.

Ni réessai, flux autonome, conversation distante, fichier, recherche Web, outil, changement automatique de fournisseur/modèle ou génération en arrière-plan. Un fournisseur absent bloque la préparation : la clé de l’autre fournisseur n’est jamais utilisée à sa place. Pour changer de modèle après préparation, revenir au texte et préparer un nouvel aperçu ; l’ancienne autorisation est invalidée et la case d’accord décochée.

Une autorisation ne peut servir qu’une fois. Modification du texte, expiration, déconnexion et nouvel aperçu empêchent la réutilisation de l’ancien. Une requête supplémentaire après erreur nécessite une nouvelle préparation et une nouvelle confirmation. Une attente 429 d’un fournisseur bloque les nouveaux aperçus IA pendant le délai connu, sans répétition réseau.

## Réponse, compte-rendu et confidentialité

La réponse est affichée comme texte, jamais comme HTML ou instruction exécutable. Refus et réponse incomplète restent signalés ; une réponse sans texte exploitable, un outil inattendu, un mauvais modèle ou un usage hors limite sont refusés. Les erreurs brutes du fournisseur ne sont ni affichées ni journalisées. Fermer ou annuler interrompt l’attente locale et tente d’annuler la requête externe ; **cela ne garantit pas l’annulation de sa facturation**. Le serveur ne relance pas et conserve la réserve.

**Conserver comme compte-rendu non vérifié** ajoute explicitement la proposition à la mission, avec fournisseur, modèle, identifiant de réponse, date, usage déclaré, estimation, réserve et source. Le fournisseur doit correspondre à l’assistant de la mission et le navigateur refuse un modèle différent de celui approuvé. Cela ne change ni le statut ni la validation de la mission. Le même identifiant ne peut pas être adopté deux fois dans une mission. Le contenu adopté est en clair dans IndexedDB et l’export d’organisation **v6**, lisible hors ligne. Les formats et migrations existants restent inchangés, Vie indépendante. Les compteurs manuels des assistants ne sont pas modifiés.

Avant adoption, le brouillon reste seulement dans l’onglet : fermer peut le perdre. LifeOS avertit si une demande modifiée, un aperçu ou une réponse non conservée est présent. L’aperçu et ses consignes sont gardés au plus deux minutes en mémoire serveur, puis supprimés ; la réponse n’est pas archivée sur le serveur. L’export ne contient pas le texte exact de l’aperçu, la clé, le cookie d’appairage ou le registre financier.

La génération OpenAI demande `store: false`, sans arrière-plan, ni historique distant. **Ce paramètre ne garantit pas une absence de rétention fournisseur** : la politique OpenAI mentionne notamment des journaux de surveillance pouvant être conservés jusqu’à trente jours, selon les contrôles du compte, et des modalités de cache. Les deux appels transmettent du texte à OpenAI après votre confirmation. Voir la [politique officielle](https://developers.openai.com/api/docs/guides/your-data).

## Catalogue et limites de coûts

Catalogue limité à trois modèles, sources officielles vérifiées le **19 octobre 2026**. Aucun prix, modèle ou hôte arbitraire n’est accepté depuis le navigateur.

- **GPT-5.6 Terra** (`gpt-5.6-terra`, missions ChatGPT) : entrée 2 USD/million, sortie 12, cache lu 0,20 ; précaution d’entrée 2,50 pour la majoration d’écriture de cache. [Modèle et tarifs](https://developers.openai.com/api/docs/models/gpt-5.6-terra), [texte](https://developers.openai.com/api/docs/guides/text), [comptage](https://developers.openai.com/api/docs/guides/token-counting), [Responses](https://developers.openai.com/api/reference/resources/responses/methods/create).
- **Claude Sonnet 5.5** (`claude-sonnet-5-5`, missions Claude) : entrée 2 USD/million, sortie 10, cache lu 0,10 ; précaution d’entrée 2,50. [Modèle et tarifs](https://platform.claude.com/docs/en/models/sonnet-5-5/overview).
- **Claude Haiku 5.5** (`claude-haiku-5-5`, missions Claude) : entrée 0,10 USD/million, sortie 0,50, cache lu 0,01 pour un prompt jusqu’à 100 000 jetons ; précaution d’entrée 0,125. La limite LifeOS de **20 000 jetons** garde ce parcours sous ce palier. [Modèle et paliers tarifaires](https://platform.claude.com/docs/en/models/haiku-5-5/overview).

Chaque modèle garde la même réserve de **0,10 USD** par tentative, même si son estimation est inférieure. L’estimation n’accorde aucune remise et ne remplace pas la facture. Aucune mise en cache Anthropic n’est demandée ; une réponse déclarant des jetons de cache non nuls est refusée dans ce parcours. Le texte de génération ne comprend que le message utilisateur et les consignes communes. Sortie maximale 1 024 jetons, outils absents, aucune recherche ou capacité de fichiers.

Claude utilise un service standard (`standard_only`), effort `low`, sans paramètres de température et sans flux. Sonnet 5.5 demande `thinking: {type: "between_tools"}` (sans outils, réponse textuelle), Haiku 5.5 `thinking: {type: "disabled"}`. Ces choix sont propres à chaque modèle ; les blocs de raisonnement, outils ou arrêts non pris en charge sont refusés. [Paramètres Messages](https://platform.claude.com/docs/en/api/messages/create), [comptage](https://platform.claude.com/docs/en/build-with-claude/token-counting), [raisonnement](https://platform.claude.com/docs/en/build-with-claude/thinking), [effort](https://platform.claude.com/docs/en/build-with-claude/effort), [versions API](https://platform.claude.com/docs/en/api/versioning).

La politique Anthropic prévoit la suppression des entrées/sorties API sous trente jours avec exceptions contractuelles, de sécurité ou légales. Aucun paramètre du parcours ne garantit une rétention nulle. Les deux appels transmettent le texte après accord. [Politique de conservation officielle](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data).

Le catalogue reste utilisable jusqu’au **18 novembre 2026 inclus**, puis bloque les envois. Sa mise à jour demande de vérifier sources et implémentation. Les identifiants peuvent évoluer côté fournisseur ; leur disponibilité dépend du compte. Ce lot n’a pas été validé avec une vraie clé.

Les limites concernent les **réservations de LifeOS communes aux fournisseurs**, pas la facture totale des comptes : taxes, évolutions de tarif, modalités de comptage, autres logiciels et usages ne sont pas contrôlés par LifeOS. Vérifier les factures des projets fournisseurs pour rapprocher les montants réels. Les jetons déclarés ne remboursent pas automatiquement le compteur. Un redémarrage avec d’autres clés conserve le registre, à condition de conserver le même dossier.

## Registre durable côté serveur

Le serveur conserve `.local-server/ai-budget.sqlite`, format de registre 1, avec journal SQLite associé si présent. Ce dossier est exclu de Git, du build, de l’APK et des sauvegardes métier. Il contient seulement identifiant d’essai, jour UTC, réserve et état technique ; aucune clé, consigne, réponse ou donnée Vie. L’utilisateur du système et ses processus restent une frontière de confiance.

La réservation est une transaction SQLite immédiate, synchronisée avant le premier appel externe. Les doublons, accès concurrents, redémarrages et réouvertures du registre ne remettent pas le budget à zéro. Un registre verrouillé, incompatible ou illisible bloque les envois. Un retour de l’horloge à un jour antérieur au dernier essai est refusé. Le registre est limité à dix mille essais sans effacement automatique ; les totaux sont calculés pour le jour UTC courant et les anciennes lignes conservées.

Ne pas supprimer, déplacer ou remplacer ce dossier pour remettre les compteurs à zéro. Pour le sauvegarder, **arrêter le serveur puis copier le dossier complet**. Une copie ou un export ancien ne permet pas de connaître les derniers essais facturables ; rapprocher la facturation fournisseur avant une restauration ou un changement de machine. Les erreurs de génération et interruptions gardent leur réserve, y compris si le processus s’arrête avant d’en recevoir l’issue. L’application n’offre aucun bouton de remise à zéro du budget.

## Vérifications et périmètre restant

Les tests utilisent de vraies connexions HTTP locales et des réponses OpenAI et Anthropic **explicitement fictives**. Ils vérifient consentement, limites, registres durables, doublons, erreurs et adoption. Aucun appel API réel ni dépense n’est nécessaire pour les lancer. Le script de saisie masquée n’a pas reçu de clé réelle pendant le développement.

L’APK présente la limite du connecteur et conserve les instructions manuelles. API privée native, serveur distant HTTPS, modèles supplémentaires, outils, automatisations validées, historique complet des échanges et rapprochement automatique de facturation restent ouverts. Les données locales existantes restent utilisables sans aucune API.

La commande « Déconnecter le serveur » révoque la session commune aux accès IA et GitHub. Un brouillon déjà reçu reste affiché et peut encore être adopté ; une nouvelle préparation est bloquée tant que ce brouillon n’a pas été conservé. La fermeture protège les modifications non enregistrées.
