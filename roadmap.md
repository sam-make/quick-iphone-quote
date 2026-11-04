# Roadmap — Phase 1 sécurité & fiabilité
## Espace Super Administrateur
- [x] Inspecter architecture, rôles, RLS et identité vérifiée du propriétaire
- [ ] Ajouter /admin, gestion globale et journal d’audit sans suppression de données
- [ ] Vérifier accès propriétaire, refus boutique et appels directs, puis régressions
## Corrections SEO
- [x] Ajouter et vérifier le sitemap des pages publiques et sa référence dans robots.txt, sans publier (4 pages publiques ; 47 tests réussis)
- [ ] Compléter les mentions légales et CGV — bloqué : identité juridique et clauses confirmées à fournir par l’éditeur
## Impression et scan des réparations
- [x] Afficher les boutons étiquette et ticket sur la fiche réparation
- [x] Afficher le scan sur le tableau de bord et la liste des réparations
- [x] Vérifier scan et aperçus d’impression dans un navigateur connecté, sans publier (44 tests réussis ; impression physique non testée)
## Suppression des paiements et abonnements
- [x] Retirer code, routes, dépendances, liens et restrictions d'abonnement sans toucher aux fonctionnalités métier
- [x] Vérifier les tests et les parcours sans publier
## Corrections avant commercialisation
- [x] Verrouiller le rattachement des profils et les rôles, vérifier les invitations et leurs échecs
- [x] Corriger uniquement les bugs bloquants identifiés et tester les parcours disponibles
- [x] Vérifier l’offre unique 10,99 EUR/mois et annoncer la souscription indisponible
- [x] Activer Stripe test après confirmation de l'utilisateur
- [x] Créer et vérifier l'offre unique Stripe test 10,99 EUR/mois taxes incluses
- [x] Ajouter parcours test, portail et synchronisation locale signée/idempotente
- [x] Tester prix, accès directs refusés (403), statut et portail après actualisation ; 35 tests réussis
- [x] Valider un paiement Checkout complet : carte test 4242 payée, retour /abonnement?retour=1 confirmé
- [x] Valider livraison distante automatique : webhook réel Stripe reçu (404 résolu), statut actif en base, idempotence et résiliation vérifiées
- [x] Tester inscription/connexion/déconnexion/reconnexion + isolation inter-boutiques (403, zéro ligne étrangère) avec un 2e compte
- [x] Créer les pages légales préparatoires (mentions légales, CGV, confidentialité) avec mentions « À compléter »
- [x] Activer le verrouillage des fonctionnalités selon l'abonnement (règle partagée base + serveur, transition boutiques existantes jusqu'au 25/11/2026)
- [ ] Compléter les informations juridiques (raison sociale, SIRET, adresse, contacts) avant publication
- [x] Vérifier visuellement les bannières d'abonnement (transition, blocage, abonné — captures validées)
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
