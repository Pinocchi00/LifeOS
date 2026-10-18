# LifeOS — Écobrutalisme éditorial

Direction demandée : une identité affirmée, calme et structurée. Le lot 0.2 s'appuie sur les trois références fournies : béton brut végétalisé, interface vert forêt botanique et composition florale éditoriale. Les fonctions restent accessibles dans les cinq espaces.

## Matière et couleur

- Papier minéral `#ece9df` pour le fond, crème `#f6f2e9` pour les surfaces.
- Encre végétale `#20372a` pour la structure, les grands titres et la navigation.
- Vert forêt `#233c2d` pour le briefing et l'atelier des assistants.
- Lichen `#b6c692` pour les états actifs, terre cuite `#a25b41` en accent ponctuel.
- Couleurs de projet désaturées avec textes foncés ; la couleur complète les libellés sans les remplacer.

## Composition

- Angles droits, bordures franches, aplats ; aucun flou décoratif, dégradé ou volume 3D.
- Grands titres sérif, corps de texte simple, repères en chasse fixe : le rythme éditorial complète la structure franche du brutalisme.
- Espaces généreux et hiérarchie explicite ; grands nombres calculés sur les données réelles.
- Jardin original devant des piliers en béton brut ; lumière et végétation apportent le contraste organique. Visuel local original décrit dans `ASSETS.md`. Aucun asset distant ni police externe.
- Bureau : navigation sombre, contenu clair, grands blocs structurés. Mobile : même identité avec composition verticale et navigation inférieure contrastée.

## Interactions

- Boutons rectangulaires et libellés visibles ; focus terre cuite au clavier.
- Statuts, erreurs, échéances et confirmations restent textuels.
- Le survol peut produire une ombre franche ; pas de mouvement décoratif permanent.
- Le thème ne modifie ni le modèle de données, ni le stockage, ni les sauvegardes.

Implémentation : `src/styles.css` et `src/zen.css` conservent la structure responsive ; `src/ecobrutalism.css` définit les tokens actifs, la direction éditoriale et les composants des assistants. Les futurs composants doivent reprendre ces tokens.
