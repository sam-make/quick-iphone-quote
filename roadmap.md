# Roadmap — Phase 1 sécurité & fiabilité
## Corrections avant commercialisation
- [x] Verrouiller le rattachement des profils et les rôles, vérifier les invitations et leurs échecs
- [x] Corriger uniquement les bugs bloquants identifiés et tester les parcours disponibles
- [x] Vérifier l’offre unique 10,99 EUR/mois et annoncer la souscription indisponible
- [x] Activer Stripe test après confirmation de l'utilisateur
- [x] Créer et vérifier l'offre unique Stripe test 10,99 EUR/mois taxes incluses
- [x] Ajouter parcours test, portail et synchronisation locale signée/idempotente
- [x] Tester prix, accès directs refusés (403), statut et portail après actualisation ; 35 tests réussis
- [ ] Valider un paiement Checkout complet : formulaire automatisé resté en traitement, paiement test manuel nécessaire
- [ ] Valider livraison distante automatique : URL webhook test retourne 404 ; version distante à actualiser avec autorisation séparée, sans publication cette fois
- [x] Exécuter les tests, contrôler les accès et examiner le diff sans publier

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
