# LifeOS — Brutalisme zen

Direction demandée : une identité affirmée, calme et structurée. Les fonctions existantes restent accessibles dans les cinq espaces.

## Matière et couleur

- Papier minéral `#eeece4` pour le fond, ivoire `#f7f5ee` pour les surfaces.
- Encre `#24271f` pour la structure, les grands titres et la navigation.
- Lichen `#cad29a` pour le briefing et les états actifs.
- Terre cuite `#b35337` pour les accents ponctuels et la marque de sceau.
- Couleurs de projet désaturées avec textes foncés ; la couleur complète les libellés sans les remplacer.

## Composition

- Angles droits, bordures franches, aplats ; aucun flou décoratif, dégradé ou volume 3D.
- Titres massifs en capitales, corps de texte simple, repères en chasse fixe.
- Espaces généreux et hiérarchie explicite ; grands nombres calculés sur les données réelles.
- Cercle ensō dessiné en SVG local : un geste ouvert, accompagné d'un sceau de terre cuite. Aucun asset distant ni police externe.
- Bureau : navigation sombre, contenu clair, grands blocs structurés. Mobile : même identité avec composition verticale et navigation inférieure contrastée.

## Interactions

- Boutons rectangulaires et libellés visibles ; focus terre cuite au clavier.
- Statuts, erreurs, échéances et confirmations restent textuels.
- Le survol peut produire une ombre franche ; pas de mouvement décoratif permanent.
- Le thème ne modifie ni le modèle de données, ni le stockage, ni les sauvegardes.

Implémentation : `src/zen.css` définit la couche visuelle, importée après les règles structurelles de `src/styles.css`. Les futurs composants doivent reprendre ces tokens et éviter les anciennes couleurs pastel.
