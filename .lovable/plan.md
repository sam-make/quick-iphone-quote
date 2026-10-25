# Audit lecture seule — Trade-In Pro (25/10/2026)

Aucune modification, publication ou bascule effectuée.

## 1. Publication
- Statut réel : **publié, public**, adresse `https://trade-in-pro-iphone.lovable.app` (répond 200).
- Divergence : les rapports précédents disaient « aucune publication par moi ». Le site a bien été publié à un moment (avant ou en dehors de ces échanges). Il tourne sur une **ancienne version** : il ne contient pas le code actuel.

## 2. Chaîne Stripe
- Go-live : 5/5 étapes terminées (compte test et compte réel liés).
- Secrets présents (valeurs non lues) : STRIPE_SANDBOX_API_KEY, STRIPE_LIVE_API_KEY, PAYMENTS_SANDBOX_WEBHOOK_SECRET, PAYMENTS_LIVE_WEBHOOK_SECRET, LOVABLE_API_KEY.
- Clés publiques : `.env.development` = clé test, `.env.production` = clé réelle. L'environnement est choisi selon le préfixe de la clé (test → sandbox, réel → live), sans repli silencieux.
- Paiement : formulaire intégré, prix unique 10,99 € (1099 centimes) vérifié contre le mode du prix ; Stripe gère taxes/conformité (+3,5 %).
- Webhook : accepte `env=sandbox|live`, signature vérifiée. Accès : règle serveur `requireShopAccess`, lecture des abonnements test et réels.
- Aucune clé secrète dans le code (seuls des faux secrets dans les tests).
- **Le mode réel ne peut pas fonctionner aujourd'hui** : l'adresse de notification réelle du site publié répond **404** → les paiements réels ne mettraient pas à jour le statut d'abonnement. Il faut publier le code actuel.
- Non vérifié : prix réel 10,99 € côté Stripe (il n'est synchronisé qu'à la publication), portail client en réel.

## 3. Pages légales — 21 mentions « À compléter »
- Mentions légales (10) : raison sociale/forme, capital, SIRET, RCS, adresse du siège, e-mail, téléphone, directeur de publication, hébergeur, e-mail support.
- CGV (5) : identité vendeur, conservation après résiliation, rétractation à valider juridiquement, médiateur, point selon forme juridique.
- Confidentialité (6) : responsable de traitement, sous-traitants/localisation, conservation après résiliation, conservation des journaux, e-mail RGPD, outils d'analyse.

## 4. Tests et build
- Tests lancés ici : **50/50 réussis** (6 fichiers).
- Build : lancé automatiquement par la plateforme, journal sans erreur ; pas relancé à la main.

## 5. Blocages
- Site publié ancien → notifications réelles en 404.
- Pages légales incomplètes alors que le site est public.
- Prix réel jamais vérifié.

## Priorités
- **P0** : compléter les mentions légales ; publier le code actuel (sur votre décision) ; vérifier ensuite que l'adresse de notification réelle ne répond plus 404 et que le prix réel est bien 10,99 € TTC.
- **P1** : un vrai paiement test sur le site publié (statut Actif, portail, résiliation, remboursement) ; faire valider rétractation/CGV par un juriste.
- **P2** : prévenir les boutiques existantes avant la fin de transition du 25/11/2026 ; corriger les 1 143 erreurs de format signalées par le lint.
