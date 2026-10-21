# Connecteurs privés Android — LifeOS 0.14

L’APK peut désormais utiliser votre serveur LifeOS HTTPS pour les références GitHub privées et les brouillons OpenAI/Anthropic. Le serveur et l’APK doivent être en **0.14 ou plus récent**. Les clés fournisseur restent dans le processus serveur ; l’application reçoit uniquement une session personnelle temporaire. Les fonctions locales restent autonomes, avec les mêmes images écobrutalistes et sans 3D.

**Aucun domaine ni hébergement n’est encore configuré pour cette installation.** Ce lot livre le raccordement logiciel et ses tests ; il ne crée pas de service public, n’achète rien et n’engage aucun appel fournisseur réel. Préparer l’hébergement selon [SERVEUR-HTTPS.md](SERVEUR-HTTPS.md) avant un usage distant réel. `127.0.0.1` sur un téléphone désigne ce téléphone ; l’adresse HTTP du PC ne convient pas.

## Enregistrer l’adresse

Dans Projets → Missions IA, ouvrir **GitHub** puis **Privé, par mon serveur**, ou le panneau **API OpenAI/Anthropic** de la mission.

1. Saisir l’origine HTTPS seule dans **Votre serveur, sur cet appareil**, par exemple `https://lifeos.exemple.fr:8443`, sans barre finale, chemin, identifiant ou paramètre. Choisir **Mémoriser cette adresse**. Cette action reste locale et ne contacte aucun serveur.
2. Choisir **Vérifier ce serveur HTTPS** ou **Vérifier l’accès IA du serveur**. Le certificat doit être accepté normalement par Android ; aucun bouton permettant de passer outre n’est proposé. Un serveur plus ancien est signalé comme incompatible.
3. Vérifier l’adresse affichée, puis saisir le code du terminal serveur. Ce code n’est ni un jeton GitHub ni une clé IA. Il est à usage unique, valable dix minutes, avec cinq erreurs au plus. Il donne accès à tous les connecteurs configurés du propriétaire.
4. Pour GitHub, demander **Vérifier et garder un relevé** sur la référence précise. Pour l’IA, relire le texte, préparer l’aperçu exact et autoriser l’envoi. L’appairage n’appelle aucun fournisseur ; aucun historique, fichier ou suivi Vie n’est joint automatiquement.

Les deux panneaux utilisent la même adresse et la même session native. Le choix du modèle, les sources, l’estimation et le budget commun demeurent visibles. Une réponse adoptée est un compte-rendu **non vérifié**, sans changement automatique du statut de mission.

## Déconnexion et changement de serveur

**Déconnecter le serveur** demande la révocation distante commune GitHub/IA et retire la session de cet appareil, y compris si le réseau ne permet pas de confirmer la révocation. Une interruption ne prouve jamais l’annulation d’une facturation IA ; aucune relance automatique n’est faite. Le registre serveur conserve les réservations déjà engagées.

**Oublier cet accès sur l’appareil** efface localement l’adresse et la session, sans appel réseau. Utiliser de préférence la déconnexion avant cet oubli. Si elle est impossible, l’ancienne session peut rester valable côté serveur jusqu’à son expiration, une heure au maximum, ou son redémarrage. Les relevés et comptes-rendus déjà conservés restent disponibles. Cette action ne les efface pas.

Une session est conservée seulement en mémoire native et limitée à une heure ; elle n’est pas restaurée après destruction du pont natif/processus. Une adresse active ne peut pas être remplacée directement. Après déconnexion, expiration ou perte de la session, redémarrer le serveur pour obtenir un nouveau code. Un même code ne permet pas d’appairer à la fois le navigateur et l’APK : ce serveur personnel autorise une seule session à la fois, sans comptes multiples.

L’adresse enregistrée est un réglage propre à cet appareil, hors organisation et Vie. Changer de serveur ne déplace pas les données locales. Importer explicitement les JSON d’organisation et de Vie pour un transfert entre appareils ; ils ne fusionnent pas les modifications.

## Frontière native

Le pont Capacitor dédié ne propose que les opérations LifeOS prévues. L’origine est vérifiée côté JavaScript puis à nouveau côté Java. Le client HTTPS utilise la confiance et la vérification du nom de l’hôte de la plateforme, TLS 1.2/1.3, sans certificat utilisateur ajouté par LifeOS, proxy applicatif, cookie, cache, redirection ou réessai HTTP. Le marqueur de protocole identifie un serveur compatible ; il ne constitue pas une attestation de l’application Android.

La session de 256 bits n’est exposée ni au JavaScript ni à IndexedDB. Le pont intercepte son reçu d’appairage et renvoie seulement le statut public. Elle n’est pas enregistrée dans les préférences, fichiers ou sauvegardes. Seule l’origine HTTPS est persistée dans les préférences privées Android ; les transferts/sauvegardes automatiques restent exclus par le manifeste. Les journaux de pont Capacitor sont désactivés pour éviter d’y consigner demandes ou codes. Le système d’exploitation et le compte de l’appareil restent une frontière de confiance ; aucune protection contre un appareil compromis n’est annoncée.

Le protocole natif exige HTTPS direct, sans origine web, métadonnées de navigation ou cookie. Il utilise un bearer limité à cette session ; le serveur refuse son utilisation comme cookie navigateur, et inversement. Les contrôles d’hôte, dépôts autorisés, tailles, budgets, aperçus, délais, annulation et révocation restent communs. Aucun CORS n’est ouvert et le serveur HTTP local refuse ce protocole.

La taille des demandes est bornée à 32 000 octets et celle des réponses JSON à 1 Mio. Les appels natifs ont un délai total de 18 secondes, ou 65 secondes pour une génération IA ; une annulation ferme l’appel sans relance. Le refus d’une redirection évite de transmettre la session à une autre origine.

Le client utilise **OkHttp 5.4.0**, compatible avec la compilation Android API 36. La version 5.5.0 publiée requiert une compilation API 37 ; son adoption est laissée à une mise à jour cohérente de la chaîne Android. Le client fixe les options de transport de façon explicite. Sources : [guide des plugins Capacitor 8](https://capacitorjs.com/docs/plugins/android), [OkHttp](https://lysine.dev/okhttp/), [journal des versions](https://lysine.dev/okhttp/changelogs/changelog/).

## Recette sans fournisseur réel

Les tests métier vérifient validation d’adresse, réglages locaux, transport du pont, absence de fetch web, annulation et réponses incompatibles. Les tests Node exercent un vrai serveur TLS avec appairage natif, séparation des types de session, expiration, consentement et révocation.

La CI compile deux scénarios instrumentés distincts sur Android 15. Le premier conserve la recette locale historique ; le second utilise un profil fictif neuf, un serveur Node TLS en boucle locale et un renvoi de port ADB. Le client installé refuse d’abord le certificat artificiel. Seul le code du **test instrumenté** injecte ensuite la confiance envers cette unique fixture, sans changer la vérification du nom ni les réglages de l’application. Aucun certificat de test n’est incorporé dans l’APK principal et aucune exemption n’est accessible depuis l’interface ou JavaScript. Les données et fournisseurs restent fictifs. Consulter [VERIFICATION.md](VERIFICATION.md) pour les résultats effectivement exécutés.

Restent ouverts : essai avec un domaine/certificat/hébergement réels, téléphone physique, réseaux des fabricants/proxies d’entreprise, multiutilisateur, synchronisation et signature de production. Les tests Chromium au format Pixel 7 restent distincts de la recette native.
