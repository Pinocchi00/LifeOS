# Images écobrutalistes complémentaires

Trois scènes originales créées le 19 octobre 2026 avec **Imagegen intégré**, en mode génération. Les références utilisateur orientent le béton brut, les jardins tropicaux, les verts forêt et l’atmosphère zen. Aucune photo récupérée sur Internet, lieu réel revendiqué, marque ou personne représentée. Aucune 3D interactive.

Les PNG sources restent dans les images générées de la session et sont copiés dans `artifacts/imagegen-0.12/`, hors Git. Les WebP du dépôt sont des conversions et réductions de taille, sans retouche du contenu artistique. Chaque scène existe en 768 × 512 et 1 536 × 1 024 pixels ; `srcset` choisit selon l’écran. Les fichiers sont embarqués et précachés pour l’usage hors ligne. La scène de la rubrique courante est seule montée dans la page ; aucun carrousel ou requête vers un fournisseur d’images.

Implémentation : `EcoScene.tsx` et `eco-scenes.css`. Projets, Vie et Explorer ont chacun leur repère visuel, sous le titre et l’action principale ; aucun texte de commande n’est posé sur une photographie. Le jardin initial d’accueil est conservé.

### atelier-vegetal

Fichiers : `public/art/atelier-vegetal-768.webp` et `public/art/atelier-vegetal-1536.webp`.

Prompt final :

> Use case: photorealistic-natural. Asset type: original architectural image inside the LifeOS productivity app. Primary request: ecological brutalism, calm and strongly architectural, consistent with the user's references of raw concrete buildings filled with tropical plants and forest-green botanical editorial design. Scene: A quiet workshop courtyard formed by massive horizontal raw board-formed concrete slabs, stepped terraces and climbing philodendron, ferns and a small mature tree. Strong geometric rhythm, lush green life emerging from the joints. No furniture needed. Wide landscape architectural composition. Style: tactile matte editorial architectural photography, realistic concrete grain, natural imperfect plants, subtle film texture. Palette: deep forest and moss green, warm mineral gray concrete, pale ivory daylight. Soft overcast natural side light, restrained meditative atmosphere. Landscape 3:2 composition, suitable for a shallow panoramic crop while still showing concrete and plants. No people, words, typography, logos, screens, UI, watermarks, neon, glossy CGI or 3D-render aesthetic. Completely original location and composition.

### jardin-interieur

Fichiers : `public/art/jardin-interieur-768.webp` et `public/art/jardin-interieur-1536.webp`.

Prompt final :

> Use case: photorealistic-natural. Asset type: original architectural image inside the LifeOS productivity app. Primary request: ecological brutalism, calm and strongly architectural, consistent with the user's references of raw concrete buildings filled with tropical plants and forest-green botanical editorial design. Scene: A serene sunken garden enclosed by rough concrete walls, a narrow rectangular shallow reflecting pool, large tropical leaves and moss at water level. A single concrete stepping path frames the water. Human scale, intimate natural sanctuary. Wide landscape architectural composition. Style: tactile matte editorial architectural photography, realistic concrete grain, natural imperfect plants, subtle film texture. Palette: deep forest and moss green, warm mineral gray concrete, pale ivory daylight. Soft overcast natural side light, restrained meditative atmosphere. Landscape 3:2 composition, suitable for a shallow panoramic crop while still showing concrete and plants. No people, words, typography, logos, screens, UI, watermarks, neon, glossy CGI or 3D-render aesthetic. Completely original location and composition.

### passage-botanique

Fichiers : `public/art/passage-botanique-768.webp` et `public/art/passage-botanique-1536.webp`.

Prompt final :

> Use case: photorealistic-natural. Asset type: original architectural image inside the LifeOS productivity app. Primary request: ecological brutalism, calm and strongly architectural, consistent with the user's references of raw concrete buildings filled with tropical plants and forest-green botanical editorial design. Scene: A passage through monumental board-formed concrete porticoes opening onto a lush botanical garden, ferns and broad leaves in the foreground, soft ivory daylight beyond. Rhythmic receding vertical pillars, a place for curiosity and discovery. Wide landscape architectural composition. Style: tactile matte editorial architectural photography, realistic concrete grain, natural imperfect plants, subtle film texture. Palette: deep forest and moss green, warm mineral gray concrete, pale ivory daylight. Soft overcast natural side light, restrained meditative atmosphere. Landscape 3:2 composition, suitable for a shallow panoramic crop while still showing concrete and plants. No people, words, typography, logos, screens, UI, watermarks, neon, glossy CGI or 3D-render aesthetic. Completely original location and composition.

