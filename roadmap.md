# Roadmap — Motion Design global Trade-In Pro

## Google sign-in
- [x] Reuse existing profiles, roles and Google provider configuration.
- [x] Add a branded Google button to the login screen and session-aware home navigation.
- [ ] Verify desktop/mobile and light/dark rendering, Google handoff and session redirect.

## Assistance IA aux estimations
- [x] Examiner le diagnostic existant et les modèles OpenAI disponibles.
- [ ] Confirmer le modèle autorisé avec le propriétaire (GPT-6 Astra bloqué par la politique de conservation ; GPT-6.1 Terra autorisé).
- [ ] Ajouter une analyse de description libre proposant uniquement des règles actives de la boutique, à confirmer sans modification des prix par l’IA.
- [ ] Tester les réponses, les accès et le parcours connecté ; ne pas publier.

## TikTok (demandes actuelles)
- [ ] Animer les couvertures estimation iPhone et scan réparation en MP4 courts, puis vérifier cadrage et titres et les regrouper avec les couvertures.
- [x] Ajouter l’attribution des arrivées TikTok par vidéo sans doubler les visites déjà comptées.
- [x] Vérifier les liens : six tests et navigateur réussis ; les clics internes à TikTok restent mesurables seulement par TikTok.
- [x] Animer la couverture nouvelle réparation et enregistrer le MP4 à côté de l’image.
- [x] Contrôler la vidéo — 5,03 secondes, 720 × 1280 ; cadrage et titres conservés sur les images de contrôle.

## Analytics Super Administrateur (demande actuelle)
- [x] Examiner données disponibles, protections propriétaire et outils graphiques.
- [x] Ajouter un suivi minimal des présences et événements futurs, sans inventer d’historique.
- [x] Intégrer statistiques, périodes, classement, inactivité et fiches boutique dans /admin.
- [x] Tester calculs, autorisations et affichage connecté sur ordinateur et téléphone.
- [x] Fournir les limites historiques dans l’écran et le résultat, sans publication.

## Chantier animations antérieur (hors périmètre Analytics)

- [x] Analyser architecture et dépendances (Framer Motion absent → CSS + React, aucune nouvelle dépendance)
- [ ] Système centralisé : keyframes + utilitaires dans styles.css, composants réutilisables (Reveal, Stagger, CountUp, PageTransition), prefers-reduced-motion
- [ ] Dashboard : cartes en cascade, stats animées, profondeur au survol
- [ ] Navigation : indicateur d'onglet glissant, transitions de pages, menus animés
- [ ] Boutons/interactions : pression, rebond, validation
- [ ] Formulaires/modales : fondu+échelle, champs progressifs
- [ ] Tableaux/listes : apparition progressive des lignes, skeleton shimmer
- [ ] Vérifier : tests, typecheck, build, contrôle navigateur
- [ ] Compte rendu : composants modifiés et animations ajoutées
