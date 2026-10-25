# Roadmap — Phase 1 sécurité & fiabilité
## Corrections avant commercialisation
- [ ] Verrouiller le rattachement des profils et les rôles, vérifier les invitations et leurs échecs
- [ ] Corriger uniquement les bugs bloquants identifiés et tester les parcours disponibles
- [ ] Vérifier l’offre unique 10,99 EUR/mois et annoncer la souscription indisponible
- [ ] Vérifier les prérequis Stripe ; demander confirmation avant activation
- [ ] Exécuter les tests, contrôler les accès et examiner le diff sans publier

- [x] Bloquer insertions directes estimations / estimation_defects / invoices (serveur seulement)
- [x] Numérotation atomique REP/FA par boutique + contraintes d'unicité
- [x] Tests moteur de prix
- [x] État chargement/erreur workspace (lien Administration)
- [x] Vérifications (tests, typecheck)

## Analyse du marché et rentabilité
- [x] Vérifier le stockage existant et les deux scénarios sans modifier Auth/RLS
- [x] Finaliser les états de saisie, chargement et erreur nécessaires
- [x] Exécuter les tests et vérifier l’enregistrement connecté, puis le rechargement
- [x] Contrôler les diagnostics automatiques et rapporter les limites sans publier
