# Diagnostic de connexion Cloudflare et Supabase (20 novembre 2026)

## Source du « Failed to fetch »
Le Worker historique `trade-in-pro-staging.samysamsung695.workers.dev` conserve le binding `SUPABASE_URL` du projet `gsaazisxtvjhekkwhulz` **en pause**. Son utilisation provoque vraisemblablement l'erreur réseau. Ne plus transmettre cette URL comme environnement de test du logiciel migré.

## Nouvelle configuration isolée
- Base autonome Supabase : `xuvaihwygkcwriqfnkbg` (active).
- Worker Cloudflare : `trade-in-pro`, créé sans exposition de route publique ; seules les Previews sont autorisées.
- Bindings vérifiés du Worker : `SUPABASE_URL` ciblant la base autonome et `SUPABASE_PUBLISHABLE_KEY` moderne du même projet. La clé publique n'est pas stockée dans Git.
- **Important** : `SUPABASE_SERVICE_ROLE_KEY` de la base autonome est absent ; les fonctions serveur qui l'exigent ne peuvent donc pas encore être validées.
- GitHub `sam-make/trade-in-pro` est connecté à Cloudflare Workers Builds ; la production est bloquée par un `deploy_command` inoffensif. Les Previews de branches utilisent `bun run build` et `wrangler preview`.
- Un appel manuel Cloudflare Builds (`4a9ce936-b43e-477c-b7c3-cf5ad7f9773b`) a exécuté le déploiement inoffensif de production, pas le code applicatif. **Ce n'est pas une preuve de déploiement de l'application.**

## Exigences avant un vrai lien de test
1. Obtenir un Preview Build réussi de la branche `migration-cloudflare` avec le vrai code compilé.
2. Confirmer que le HTML et les requêtes `auth/v1` utilisent `xuvaihwygkcwriqfnkbg`, jamais l'ancien staging.
3. Vérifier les réglages Supabase Auth et réaliser la connexion avec un compte de test contrôlé, sans divulguer son mot de passe.
4. Installer la clé serveur **dans les secrets Cloudflare uniquement**, puis tester les opérations serveur et RLS. Aucun secret dans ce fichier ni dans les logs.
5. Tester les parcours métier en navigateur réel, corriger les échecs, sauvegarder et synchroniser les dernières écritures Lovable.
6. Après GO/NO-GO favorable, seulement alors envisager le déploiement public et un retour arrière.
