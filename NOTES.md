# NOTES — Trade-In Pro
Date : 2026-11-20
Branche de travail : `migration-cloudflare`; ne jamais écrire directement sur `main`.

## Architecture
GitHub pour le code, Cloudflare Workers pour TanStack Start SSR, Supabase pour les données et comptes. Lovable exclu de la cible. Production interdite sans accord.

## Réalisé pour la PR fondations
- Vérification d'accès GitHub : branche créée, fichier `TEST_ACCES.md` créé puis supprimé.
- `AGENTS.md` remplacé par cinq agents et des règles strictes.
- `.env`, `.env.development`, `.env.production` retirés du suivi de la branche ; `.gitignore` renforcé, `.env.example` sans valeurs ajouté.
- Connexion Google / bibliothèque `@lovable.dev/cloud-auth-js` supprimées ; connexion e-mail/mot de passe conservée.
- Vérifications GitHub Actions sur PR : installation, types, lint, tests, build, secrets.
- Architecture cible documentée.

## Sécurité des anciennes variables
Aucune variable `SUPABASE_SERVICE_ROLE_KEY` relevée dans les trois fichiers d'environnement examinés. Une variable de jeton client de paiement `VITE_PAYMENTS_CLIENT_TOKEN` y était renseignée ; ne pas afficher sa valeur. Des clés Supabase publiques y étaient renseignées. Ces fichiers existent dans l'historique Git antérieur : les retirer de la dernière version ne purge pas l'historique. Vérifier le caractère secret des valeurs et décider d'une rotation si nécessaire, sans action irréversible automatique.

## Blocages et vérifications
- Les dépendances restantes `@lovable.dev/vite-tanstack-config` et `@lovable.dev/ai-gateway`, et le verrou `bun.lock`, ne sont pas modifiés dans cette mission ; la suppression complète de Lovable reste à faire.
- Le code de paiement et les fonctions SQL du propriétaire restent intacts.
- **Installation, tests, types, lint et build NON EXÉCUTÉS** : l'environnement local ne possède pas Bun (commande introuvable) et n'a pas d'accès réseau pour cloner le dépôt. Tentative `git ls-remote https://github.com/sam-make/quick-iphone-quote.git HEAD` : `fatal: unable to access ... Could not resolve host: github.com`. Aucune erreur de compilation n'est donc démontrée ; résultat inconnu. GitHub Actions devra effectuer ces vérifications à l'ouverture de la PR.
- Vérifier que GitHub Actions s'exécute avec succès avant fusion. **Configurer aussi la protection de la branche main (contrôles obligatoires)** ; la présence d'un workflow seule ne bloque pas automatiquement la fusion. Le scan de secrets peut signaler l'historique Git contenant les anciens `.env`.
- Aucun accès ni modification à la production ou à Supabase.

## Suites proposées (nécessitent accord pour nouvelles modifications)
1. Réparer la compilation Cloudflare Workers autonome sans bibliothèque Lovable.
2. Réviser le verrou Bun pour retirer les entrées devenues inutiles.
3. Valider sécurité RLS, estimations, numérotation REP/FA et mobile avec des tests automatisés.

## Mission suivante : sortie technique de Lovable (2026-11-20)
- `bun.lock` : 140 URL d'archives du cache privé remplacées par `registry.npmjs.org` ; références directes `@lovable.dev/*` supprimées du verrou. **Attention** : verrou ajusté par transformation du fichier existant, pas régénéré localement avec Bun ; la résolution de `@cloudflare/vite-plugin` et `wrangler` est faite dans GitHub Actions pendant `bun install`. Faire ultérieurement une régénération canonique, committer le résultat puis activer une installation figée.
- `package.json` : retrait de `@lovable.dev/vite-tanstack-config`, `@lovable.dev/ai-gateway`, Nitro ; ajout de `@cloudflare/vite-plugin` et `wrangler`. Aucune logique Stripe modifiée.
- `vite.config.ts` : configuration officielle Cloudflare Vite + TanStack Start + React + Tailwind CSS + alias TypeScript ; option d'entrée serveur `server` conservée pour `src/server.ts`. `wrangler.jsonc` définit un Worker serveur, sans déploiement automatique.
- `bunfig.toml` : garde de sécurité de publication 24 h préservée ; exceptions privées Lovable supprimées.
- `drizzle.config.ts` : `DATABASE_URL` à la place de `LOVABLE_DB_MIGRATION_URL`. Ne pas exécuter de migration sans autorisation.
- `src/lib/lovable-error-reporting.ts` supprimé : erreurs de racine journalisées par `console.error`. Code d'attribution TikTok basé sur `__lovableEvents` retiré de l'accueil ; mesure TikTok absente jusqu'à une solution indépendante.
- `src/integrations/supabase/previewAuthStorage.ts` supprimé : stockage standard Supabase dans le navigateur, sans relais Lovable. Les sessions éventuellement propres aux domaines d'aperçu ne se transfèrent pas automatiquement entre domaines.
- Code restant spécifiquement lié à Lovable dans les archives `.lovable/`, `README.md` et certains textes générés. Aucun de ces historiques n'est nécessaire à l'exécution mais la suppression complète doit être vérifiée.

### Fonctionnalités cachées de l'ancien Vite
1. **Devtools TanStack** (outils de diagnostic en développement) : pas réinstallés pour l'instant. Ce n'est pas nécessaire à la production ; vérifier le besoin et la compatibilité avant d'ajouter un paquet.
2. **Alias `@/` et chemins TypeScript** : repris par `vite-tsconfig-paths`.
3. **Cible Cloudflare** : reprise par `@cloudflare/vite-plugin`, remplaçant le déploiement Nitro. Attention : aucune compilation Worker réussie prouvée à ce stade.
4. **React/TanStack dedupe** : reprise par `resolve.dedupe`.
5. **Injection `VITE_*`** : effectuée par Vite en construction ; ne jamais y mettre `service_role`.
6. **Capture d'erreurs Lovable** : retirée à la demande, remplacée par les journaux locaux.
7. **Détection sandbox / host / strictPort** : spécifique à l'ancien environnement Lovable, non reconduite ; vérifier si une configuration spéciale de développement est souhaitée.

### GitHub Actions : résultats déjà observés
- Contrôle des secrets : PASSÉ sur les exécutions inspectées.
- Vérification des types : un ancien échec `src/routes/index.tsx(95,19)` et `(96,14)` provenait de `__lovableEvents` ; référence supprimée dans le nouveau commit.
- Lint : 1 839 problèmes (1 830 erreurs, 9 avertissements) sur un commit après suppression de `__lovableEvents`, très majoritairement erreurs de formatage `prettier/prettier` dans des fichiers existants. Le CI reste rouge. Ne pas masquer le problème en désactivant les règles.
- Workflow ajusté pour lancer les tests et le build même après un échec de lint, afin de découvrir d'autres blocages. Vérifier les résultats de la dernière exécution.
- Le conteneur local n'a ni Bun ni accès GitHub ; seuls les jobs GitHub Actions constituent une exécution technique à distance.

### Résultat vérifié après correction (run GitHub Actions 44705696149, commit 4280402)
- Installation Bun : **SUCCÈS**.
- Vérification TypeScript : **SUCCÈS**.
- Tests automatisés : **SUCCÈS** (étape GitHub Actions ; nombre de tests à confirmer si nécessaire).
- Build Vite / Cloudflare : **SUCCÈS** (compilation seulement, aucun déploiement ni test runtime de Worker).
- Scan de secrets : **SUCCÈS**.
- Lint : **ÉCHEC** (1 839 problèmes relevés dans un run antérieur ; le nombre exact du run 44705696149 doit être confirmé à ses journaux). La PR n'est **PAS verte**.
- Décision : ne pas désactiver les contrôles ni reformater massivement des fichiers hors du périmètre sans autorisation.
- `main` protégée d'après le propriétaire ; PR n°1 toujours en brouillon, non fusionnée.

## Session lint du 20 novembre 2026 — résultats vérifiés
- État initial (run 44705891478) : **1 839 problèmes**, dont 1 830 erreurs `prettier/prettier`, 8 avertissements `react-refresh/only-export-components`, 1 avertissement `react-hooks/exhaustive-deps`.
- Groupe 1 : `bunx eslint . --fix` a automatiquement corrigé **1 830 problèmes de formatage**. Modifications enregistrées sur `migration-cloudflare` par GitHub Actions (commit 183c2e5). Le job automatique temporaire a été supprimé du workflow ensuite.
- Groupe 2 : dépendances primitives du `useEffect` dans l'administration. Avertissement React Hooks corrigé sans ignorer la règle.
- Groupe 3 : suppression de quatre exports internes inutilisés par d'autres modules : `badgeVariants`, `useFormField`, `navigationMenuTriggerStyle`, `useSidebar`.
- Groupe 4 : extraction de `buttonVariants` et `toggleVariants` dans des fichiers autonomes, avec mise à jour des imports consommateurs.
- Groupe 5 : extraction de `ownerAnalyticsOptions` dans `src/lib/owner-analytics.options.ts` pour préserver la mise en cache des statistiques sans export non-composant.
- Groupe 6 : séparation de `AuthProvider`, `AuthContext` et du hook `useAuth` pour conserver le comportement de connexion et supprimer le dernier avertissement.
- Corrections secondaires de formatage des imports et de la fin des fichiers après extraction.
- **Total corrigé : 1 839 / 1 839 ; restant : 0 erreur et 0 avertissement.** Aucune règle désactivée et aucun commentaire d'ignorance ajouté.
- **Vérification GitHub Actions 44715156157 sur commit 117ae1d : SUCCESS** : installation, TypeScript, lint (aucune erreur ni avertissement), 10 fichiers de tests, build Vite/Cloudflare, scan de secrets.
- Aucune action sur `main`, la production, les paiements ou Supabase. Pull request 1 toujours non fusionnée. Le succès du build ne remplace pas un test fonctionnel en ligne.

## Reprise technique — 20 novembre 2026 (après correction du lint)

### Vérifications et correctifs effectués
- PR n°1 toujours en brouillon ; toutes les modifications sont sur `migration-cloudflare`. Production, paiement et SQL propriétaire non modifiés.
- Inspection **en lecture seule** du Worker `trade-in-pro-staging` : `SUPABASE_URL` correspond au projet Supabase de test ; les liaisons `SUPABASE_PUBLISHABLE_KEY` (publique) et `SUPABASE_SERVICE_ROLE_KEY` (serveur uniquement) existent. Aucune valeur de clé affichée ni modifiée. Aucune variable `VITE_*` enregistrée dans les liaisons du Worker.
- **Bug prioritaire évité** : le navigateur ne recevait pas automatiquement les variables publiques `SUPABASE_*` présentes sur le Worker. Ajout de `src/integrations/supabase/public-config.ts`, qui transmet uniquement URL + clé publique par les balises HTML `meta` générées au rendu serveur. Cela évite de dépendre d'une valeur `VITE_*` à la compilation. Test de priorité configuration serveur vs ancienne configuration compilée ; aucune clé `service_role` transmise.
- Nettoyage de messages Lovable restants dans le client serveur et le contrôle d'authentification. `.env.example` utilise `DATABASE_URL` (Drizzle).
- **Nouveau contrôle GitHub Actions sans déploiement** : `vite preview` lance le vrai Worker localement. Deux pages publiques répondent HTTP 200 et l'URL fictive de Supabase apparaît bien dans l'HTML. Le fichier `.dev.vars` fictif doit être créé **avant `vite build`**, car Cloudflare le copie au résultat utilisé par `vite preview`. Aucun compte réel ni base réelle n'est contacté.
- **Défaut critique du verrou découvert** dans les journaux : `InvalidLockfile: failed to parse lockfile`. L'installation l'ignorait et le recréait. Un job unique a généré un verrou canonique et l'a commité, puis a été retiré. Désormais l'installation utilise `bun install --frozen-lockfile --ignore-scripts` pour empêcher tout changement silencieux de versions.
- **Résultat vérifié** du workflow `44731426820` : installation figée, TypeScript, lint, 11 fichiers de tests, build, rendu Worker local et scan de secrets **tous réussis**. Aucun déploiement sur Cloudflare.
- `.gitignore` inclut désormais `.dev.vars*` pour exclure aussi les variantes nommées ; `README.md` ne dirige plus vers Lovable ; vérification de l'absence de variable serveur `SUPABASE_SERVICE_ROLE_KEY` dans les bundles navigateur ajoutée au workflow.

### Cinq relectures avant validation
- Sécurité : **partiel** — scan de secrets et isolation du code client contrôlés ; isolation RLS entre deux boutiques et clé serveur réelle non testées.
- Qualité : **validé en CI** — installation figée, types, lint, compilation.
- Tests : **validé en CI sur tests existants** — 11 fichiers de tests et rendu serveur local ; tests de bout en bout avec vrais comptes non réalisés.
- Base de données : **aucune migration appliquée** ; export et restauration restent à organiser sur la base de test.
- Réparateur : **non vérifié en conditions réelles** — appareil mobile, parcours devis/client/réparation/facture à tester avec réparateurs.

### Priorités recommandées
1. Tester une connexion e-mail/mot de passe et les parcours boutique sur un déploiement de **staging** explicitement isolé, jamais en production. Confirmer avant de déployer.
2. Vérifier l'isolation multi-boutiques/RLS et les références de factures et réparations en situation réelle.
3. Préparer un export manuel contrôlé de la base de test avant d'ajouter des données de réparateurs.
4. Ne pas créer d'agents IA autonomes pour l'instant : les cinq rôles d'`AGENTS.md` sont des contrôles de relecture, pas des services payants.

## Audit des sauvegardes et de l'authentification — 20/11/2026
- Source : **le vrai Trade-In Pro** publié via Lovable, backend Supabase géré par Lovable Cloud, référence retrouvée dans les variables du projet `omjonrbowazuicnbpuux` ; l'accès direct via le compte Supabase connecté est refusé.
- L'export métier remis par le propriétaire (`trade-in-pro-public-export.sql`, 200580 octets, SHA-256 `6cf56b97f71620050cc76a94adc6fb454c42496839387f00c674783933d1d4be`) possède 24 sections de données et **24/24 comptes de lignes identiques** à la source Lovable lors du contrôle. Aucun fichier privé commité.
- `auth.users` : 17 comptes dont 17 avec hachage ; `auth.identities` : 17 identités toutes `email`. Les 11 profils correspondent aux utilisateurs Auth. **L'authentification n'a pas été exportée ni transférée**.
- `repair-photos` : 0 fichier ; `repair_photos` : 0 ligne au contrôle. Inventaire à revalider à la bascule.
- Aucun changement Supabase, Cloudflare ou production. Aucune fusion. Le projet Supabase de production destinataire reste à choisir/créer avec accord sur l'organisation et le coût éventuel.
- [Plan et audit en lecture seule](docs/MIGRATION_PRODUCTION.md). Ne pas utiliser la base staging ni écraser le projet Supabase préexistant. La PR 1 reste en brouillon.

## Restauration Supabase production — 20/11/2026
- Nouveau projet **`trade-in-pro-production`** : `xuvaihwygkcwriqfnkbg`, région Paris, `ACTIVE_HEALTHY`.
- Source Lovable inchangée. Les **17** utilisateurs Auth et **17** identités email ont été transférés avec UUID et hachages identiques, sans exporter de secrets vers GitHub. Les **24** tables publiques / **538** lignes de l'instantané source ont été restaurées et comparées par empreinte des données : **24/24 identiques**.
- **61 politiques RLS**, **24 tables RLS**, **18 déclencheurs** et **4 politiques Storage** pour le compartiment privé `repair-photos` recréés. Aucun fichier photo actif dans la source au contrôle.
- Tests SQL de cloisonnement : rôle anonyme 0 ligne visible ; compte boutique isolé ; propriétaire super-admin reconnu, autre membre non propriétaire ; 0 référence orpheline Auth/profils/rôles.
- Audit Supabase : fonctions `SECURITY DEFINER` exposées et protection anti-mot-de-passe-compromis à examiner avant publication.
- Configuration Wrangler du Worker modifiée **sur la branche PR uniquement** de `trade-in-pro-staging` à `trade-in-pro`. Aucune publication du Worker de production ni connexion Cloudflare à la nouvelle base à ce stade.
- Blocage de lancement : **vérification réelle de connexion depuis le navigateur, configuration des secrets Worker, et synchronisation finale après gel des écritures Lovable**.
- Aucun SQL métier privé ni données Auth publiés dans le dépôt. La PR reste en brouillon.

### Sécurisation préalable au lancement (20/11/2026)
- Source/destination : 24/24 empreintes de lignes métier identiques, 538 enregistrements ; 17 comptes Auth hachés identiques ; identités Auth complètes identiques ; 0 profil/role orphelin.
- RLS : utilisateur anonyme 0 ligne, compte boutique limité à sa boutique, statut propriétaire attendu. 4 politiques Storage et bucket privé `repair-photos` reproduits ; 17 fonctions et 18 triggers identiques.
- Révocation des droits `anon`/`authenticated` sur `seed_default_rules(uuid)` et `seed_default_services(uuid)` ; serveur `service_role` toujours autorisé.
- Auth source : 11 e-mails confirmés, 6 non confirmés ; 9 comptes avec jetons temporaires dans la source (non migrés), nouvelles confirmations nécessaires selon parcours.
- Workflow manuel de déploiement production préparé sur PR brouillon ; **aucun Worker production déployé, aucune configuration de clé serveur effectuée**, aucun DNS modifié.


## Agents Codex et orchestration — 20 novembre 2026
- Six sous-agents Codex projet créés avec rôles distincts : sécurité, données, authentification, qualité, expérience réparateur et déploiement.
- Configuration dans `.codex/config.toml` ; les modèles héritent du parent pour éviter d'imposer un modèle indisponible ; permissions et accès MCP hérités du parent.
- Nouveau contrôle GitHub Actions non déployant : `.github/workflows/agents-preflight.yml` et `scripts/check-agent-contract.py`.
- Tableau de dépendances et GO/NO-GO : `docs/AGENTS_PRODUCTION.md`. Les agents définis ne sont pas des processus déjà démarrés : ils s'activent en session Codex.
- État : PR n°1 en brouillon. Les 24 tables et 17 utilisateurs sont restaurés, mais connexion réelle, données finales et Worker Cloudflare public **non validés**.

## Lancement manuel du sprint agents — 20/11/2026
- Le sprint de préparation `Automation_b5eb05ac5a8881918c0ecfaa10de05b9` a été déclenché manuellement par `run_now`; l'exécution a été effectuée **dans le chat courant** (retour `inline_run`), et non par six processus Codex permanents. Les séances horaires déjà planifiées restent séparées.
- Configuration des six rôles Codex lue et validée dans `.codex/agents`. Aucun sous-agent Codex autonome n'a été lancé par cette interface : elle ne dispose pas du mécanisme de délégation Codex.
- CI du commit `e0310d4aaf2ea2f866c58ac2400c8362cea64082` : `Agents Codex - contrôle de préparation` et `Vérifications de la pull request` **SUCCÈS** (runs 44752285588 et 44752285573).
- Audit live **lecture seule** : 24/24 tables métier et 538/538 lignes, empreintes identiques ; `auth.identities` identique (17 comptes). `auth.users` même nombre 17 avec jetons temporaires différents ; ne pas réimporter.
- Supabase sécurité : 1 INFO (`rls_enabled_no_policy`), 3 WARN (deux catégories `SECURITY DEFINER` exposées et protection contre les mots de passe compromis désactivée). Risques consignés dans issue #3 ; dérive données issue #4.
- Cloudflare non déployé, PR #1 non fusionnée. P0 encore ouverts : vraie reconnexion des utilisateurs, test métier navigateur, examen des privilèges, delta Lovable final et GO/NO-GO.

## Sprint programmé 16 h 30 — audit sécurité RPC, 20/11/2026
- Audit direct de `pg_proc` et `has_function_privilege` sur Supabase cible : 12 fonctions `SECURITY DEFINER` dans `public` ; 10 exécutables par `anon` et `authenticated`, 2 seed restreintes.
- Code SQL de `owner_analytics`, `super_admin_mutate`, `next_shop_reference`, `record_shop_presence`, `has_role`, `current_shop_id` et `business_access_allowed` lu en lecture seule. Risque P1 d'énumération potentielle via `has_role(_user_id, _role)` à tester, sans conclusion d'exploitabilité.
- Supabase Security Advisor inchangé : 1 INFO et 3 WARN. Inventaire, remédiations prudentes et GO/NO-GO consignés dans `docs/AGENTS_PRODUCTION.md` et issue #4.
- Les deux GitHub Actions du commit `972d11e3` ont réussi. Nouvelle CI attendue après ce commit de documentation.
- Aucun changement SQL ni production, aucun compte client touché. Auth réelle, RLS multi-boutiques sous JWT et parcours navigateur restent NON VÉRIFIÉS. Sous-agents Codex non exécutables directement par cette session ; audits réalisés avec les connecteurs.

## Relance à la demande — 20/11/2026, vers 17 h (Europe/Amsterdam)
- Automatisation du sprint vérifiée **activée** : exécution de 16 h 30 terminée, prochaine séance prévue à 17 h 30 ; déclenchement immédiat `run_now` accepté avec retour `inline_run` (travail dans la conversation, pas six processus indépendants).
- Lecture effective sur `migration-cloudflare` de `AGENTS.md`, `NOTES.md`, `docs/AGENTS_PRODUCTION.md`, `.codex/config.toml`, des six fichiers `.codex/agents/*.toml`, de la PR #1 et des tickets #2 à #7.
- Vérification factuelle : `.codex/config.toml` autorise jusqu'à six threads **par session Codex** ; cette conversation n'a pas de mécanisme de lancement de sous-agents Codex. Aucun thread autonome n'est donc confirmé en cours.
- Responsabilités conservées : `security_auditor` (#3), `data_migration` (#4), `auth_specialist` (#2), `qa_engineer` (#5), `repairer_ux` (#7), `release_engineer` (#6).
- Décision : **NO-GO** inchangé. Auth réelle, tests RLS sous JWT, parcours mobile, synchronisation delta Lovable et préproduction indépendante restent à prouver. Aucun déploiement, SQL, paiement, compte réel ni donnée client modifiés ; tâche quotidienne inchangée.

## Sprint 17 h 30 — contrôle UX et branche Cloudflare (20/11/2026)
- Relecture effective des instructions `AGENTS.md`, `NOTES.md`, `docs/AGENTS_PRODUCTION.md`, des six rôles `.codex/agents/*.toml`, de la PR #1 et des issues #2 à #7. Les six domaines ont leurs tickets respectifs : sécurité #3, données #4, Auth #2, QA #5, UX #7, Cloudflare #6. Aucun sous-agent Codex autonome n'est disponible depuis cette exécution ; contrôles réalisés directement via GitHub.
- Vérification statique ciblée dans `src/routes/__root.tsx` : le document HTML était déclaré `lang="en"` et les erreurs globales 404/chargement étaient affichées en anglais alors que l'application est destinée aux réparateurs francophones.
- Correction sûre et limitée sur `migration-cloudflare` : `lang="fr"`, messages 404/erreur et actions de retour/reprise en français. Commit `6021d899d5912c457604ce8710c78b9adcf66998`. Aucun tarif, paiement, donnée, secret ni environnement de production modifié.
- Contrôle CI via l'API des workflows associés au commit : **aucun run `pull_request` encore retourné au moment du contrôle** ; succès de compilation du nouveau commit NON VÉRIFIÉ. Les sessions suivantes doivent recontrôler les workflows, ne pas annoncer PASSÉ prématurément.
- Auth réelle : NON VÉRIFIÉ ; sécurité RPC/RLS sous JWT : PARTIEL ; delta Lovable : NON VÉRIFIÉ ; parcours boutique et mobile réels : NON VÉRIFIÉ ; Worker Cloudflare indépendant : NON DÉPLOYÉ. Décision : **NO-GO**.

## Sprint 18 h 30 — revue CI et correction UX (20/11/2026)
- Relecture actuelle de `AGENTS.md`, `NOTES.md`, `docs/AGENTS_PRODUCTION.md`, des six fichiers `.codex/agents/*.toml`, de la PR #1 et des tickets #2 à #7. Responsables : Auth #2, sécurité #3, données #4, QA #5, Cloudflare #6, UX #7. Sous-agents Codex non exécutables depuis cette interface ; revue directe via GitHub.
- **CI vérifiée** pour le commit UX précédent `6021d899` : les workflows « Agents Codex - contrôle de préparation » (run `44774094405`) et « Vérifications de la pull request » (run `44774094467`) sont tous deux terminés en **SUCCESS**. Cette preuve porte sur ce commit, pas sur les commits ultérieurs.
- Défaut UX résiduel vérifié dans `src/routes/__root.tsx` : bouton de retour de la page d'erreur toujours libellé « Go home » malgré les autres traductions. Correction limitée en « Retour à l'accueil » sur `migration-cloudflare`, commit `cb7d499a3c46f309fc830102a8f03150c7d4c30a` ; CI de ce nouveau commit à contrôler.
- **NO-GO** : aucune connexion réelle historique, test RLS multi-boutiques sous JWT, parcours mobile de bout en bout, rattrapage des écritures Lovable ou préproduction Cloudflare autonome vérifiés dans cette séance. Aucune modification de `main`, production Lovable, Supabase, paiements, comptes ou secrets.
