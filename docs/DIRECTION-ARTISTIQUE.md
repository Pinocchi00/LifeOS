# LifeOS — Jardin de travail

Direction demandée : une identité affirmée, calme et structurée. Après le lot 0.2 inspiré des trois références fournies, le lot 0.3 fait évoluer ce langage en jardin de travail interactif : béton brut végétalisé, profondeur réelle, mouvement contextualisé et composition éditoriale. L'image originale est conservée sans retouche.

## Matière et couleur

- Papier minéral `#ece9df` pour le fond, crème `#f6f2e9` pour les surfaces.
- Encre végétale `#20372a` pour la structure, les grands titres et la navigation.
- Vert forêt `#233c2d` pour le briefing et l'atelier des assistants.
- Lichen `#b6c692` pour les états actifs, terre cuite `#a25b41` en accent ponctuel.
- Couleurs de projet désaturées avec textes foncés ; la couleur complète les libellés sans les remplacer.

## Composition

- Angles droits et bordures franches pour structurer les actions ; modelé, ombres et profondeur pour donner une présence au jardin.
- Grands titres sérif, corps de texte simple, repères en chasse fixe : le rythme éditorial complète la structure franche du brutalisme.
- Espaces généreux et hiérarchie explicite ; grands nombres calculés sur les données réelles.
- Jardin original devant des piliers en béton brut ; lumière et végétation apportent le contraste organique. Visuel local original décrit dans `ASSETS.md`. Aucun asset distant ni police externe.
- Bureau : navigation sombre, contenu clair, grands blocs structurés. Mobile : même identité avec composition verticale et navigation inférieure contrastée.
- Trois terrasses en vraie 3D représentent journée, projets et assistants. Leur sélection révèle un contexte et une action, sans coder artificiellement une progression dans la taille des plantes.

## Interactions

- Boutons rectangulaires et libellés visibles ; focus terre cuite au clavier.
- Statuts, erreurs, échéances et confirmations restent textuels.
- Le mouvement relie un geste à sa conséquence : orientation du regard, changement de terrasse, changement de page, validation d'une tâche ou ouverture d'un dialogue. La scène se stabilise et s'arrête ; aucun carrousel ni rotation permanente.
- Le thème ne modifie ni le modèle de données, ni le stockage, ni les sauvegardes.
- Le mode calme et les réglages de l'appareil désactivent les animations ; une vue illustrée complète remplace la 3D lorsque nécessaire. Les informations et commandes restent en HTML accessible.
- Les textes indiquent une action ou un état vérifiable : créer, retrouver, se concentrer, terminer, rouvrir, enregistrer. Les durées, résultats et activités distantes ne sont pas inventés.

Implémentation : les feuilles de structure et d'écobrutalisme sont complétées par `src/living-garden.css`. `DailyGarden` porte la prochaine action et les commandes HTML ; `gardenScene.ts` est chargé séparément pour le relief ; `FocusSession` réduit l'interface à une tâche. Les futurs composants doivent reprendre ces tokens et ces principes.
