# Migration en production — base actuelle de Trade-In Pro

> **État : copie de migration restaurée et contrôlée sur Supabase autonome, aucune mise en ligne Cloudflare, aucune fusion.**
> Source de vérité : projet Lovable Cloud du véritable Trade-In Pro, base Supabase accessible via l'intégration Lovable.
> Ne pas utiliser la base `trade-in-pro-staging` ni écraser l'ancien projet personnel `app gestion de client`.

## 1. Sauvegarde métier disponible

Fichier exporté localement par le propriétaire : `trade-in-pro-public-export.sql`.
- Taille observée : **200 580 octets**.
- SHA-256 : `6cf56b97f71620050cc76a94adc6fb454c42496839387f00c674783933d1d4be`.
- Export PostgreSQL 17 du schéma `public`, avec 24 tables, 17 fonctions, 61 politiques RLS et 24 tables ayant RLS activé.
- Une comparaison de lecture seule le 20/11/2026 avec le connecteur Lovable a confirmé **24/24 comptes de lignes identiques**.
- Quelques volumes : 14 boutiques, 11 profils, 8 clients, 9 estimations, 14 réparations, 10 factures.
- `repair_photos` : 0 enregistrement ; le compartiment `repair-photos` : 0 fichier au contrôle.
- Ce fichier contient des données personnelles. **Ne jamais le commiter**, le mettre dans une issue ou un journal CI, ni le publier.
- Ce SQL **n'est pas** un dump d'Auth, de Storage ou des paramètres du service. Garder une copie chiffrée hors GitHub.
- La version reçue ne doit jamais être modifiée directement : préparer une copie de travail si des ajustements sont nécessaires.
- Ce fichier contient `CREATE SCHEMA public;` alors que Supabase crée déjà ce schéma. **Ne pas exécuter directement le dump sans vérifier ce conflit et les extensions/rôles requis.**

## 2. Comptes : contrôle de restauration

Le schéma `auth` du vrai Trade-In Pro contient, au 20/11/2026 :
- 17 enregistrements `auth.users` ;
- 17 identités `auth.identities`, toutes de type `email` ;
- 17 utilisateurs avec un `encrypted_password` non vide (hachage, jamais mot de passe clair) ;
- 11 profils, tous avec le même identifiant qu'un compte Auth ;
- un compte propriétaire relié à `auth.users`.

**État au 20/11/2026 : 17 utilisateurs et 17 identités transférés dans la base de production autonome, avec leurs UUID et hachages de mot de passe ; empreintes Auth comparées à la source : identiques.** Aucune session n'a été transférée, les clients devront se reconnecter après la bascule.

Pour conserver les mots de passe, envisager une migration **sécurisée et complète** des tables `auth.users` et `auth.identities` (et dépendances indispensables) depuis la source Lovable vers le nouveau Supabase. Respecter exactement les UUID. La procédure dépend du schéma Auth cible et doit être testée avant la bascule.

Ne jamais afficher, écrire dans les logs ou envoyer dans GitHub les hachages de mots de passe, tokens, clés, identités privées. L'utilisation du connecteur Lovable pour une inspection en lecture seule **ne donne pas** un accès administrateur direct à la source.

Il n'y a actuellement **aucune identité Google** dans l'inventaire interrogé. Faire revalider cet inventaire au moment de la migration.

## 3. Destination

**Créé et vérifié le 20/11/2026** : projet Supabase **`trade-in-pro-production`**, référence **`xuvaihwygkcwriqfnkbg`**, région **`eu-west-3`** (Paris), organisation du propriétaire. Création confirmée à **0 par mois dans le devis Supabase** ; les quotas gratuits et éventuels dépassements restent à surveiller.

**État à la création** : projet `ACTIVE_HEALTHY`, vide, puis **restauration exécutée depuis Lovable**. Contrôle post-restauration : 17 Auth, 17 identités, 24 tables publiques, 538 lignes métier, 61 politiques RLS et 18 déclencheurs applicatifs. Les 24 tables ont une empreinte de données **identique** à la source à la date du contrôle. Aucun fichier photo à transférer ; compartiment privé `repair-photos` et 4 politiques Storage créés à l'identique.

**Contrôles d'autorisation** : rôle `anon` = 0 boutique / client / réparation visible ; utilisateur boutique = ses propres données seulement, aucune autre boutique visible ; compte propriétaire = super-administrateur, autre membre = non-propriétaire.

**Audit sécurité Supabase** : avertissements non bloquants à examiner avant publication : exécution de fonctions `SECURITY DEFINER` exposées, protection des mots de passe compromis désactivée ; tables RLS volontairement dépourvues de politiques (journaux/audit interne). Ne pas désactiver les fonctions nécessaires aux politiques sans vérification de dépendances.

**Attention** : restauration d'un **instantané**, pas synchronisation temps réel. La source Lovable reste active et peut évoluer : comparer les données et synchroniser les modifications finales avant bascule, après gel des écritures.

Pour libérer la place sur le plan Free (maximum deux projets actifs), le projet de test `gsaazisxtvjhekkwhulz` a été **mis en pause sans suppression** et vérifié `INACTIVE`. Le projet personnel `tkgupuunzudnynehvjhf` reste `ACTIVE_HEALTHY`.

Ne pas écraser ces projets existants :
- `tkgupuunzudnynehvjhf` : projet `app gestion de client`, non vide (1 compte Auth, schéma public existant) ;
- `gsaazisxtvjhekkwhulz` : copie de test, dont les UID Auth ne correspondent pas aux profils copiés.

La destination est sélectionnée. Vérifier le devis, les quotas et les sauvegardes avant de faire passer ce projet à un usage réel.

## 4. Ordre de migration et bascule (préparatifs validés, bascule non réalisée)

1. Sauvegarder la source et conserver l'empreinte SHA-256. Préparer un export **final** après suspension temporaire des écritures au moment de la bascule.
2. Exporter les données Auth en canal sécurisé et vérifier le schéma compatible de la nouvelle base ; sauvegarder aussi le paramétrage des courriels d'Auth. Ne pas importer de sessions ou tokens expirés.
3. Importer et vérifier Auth dans la cible, en conservant UUID et hachages. Les utilisateurs devront **au moins se reconnecter** sur le nouveau domaine (les JWT sont propres au projet).
4. Préparer une copie compatible du `pg_dump` public (schéma `public` déjà présent, fonctions et extensions, droit `SECURITY DEFINER`, triggers, références Auth) ; l'importer sous transaction avec arrêt à la première erreur. Ne pas fusionner manuellement des tableaux sans vérifier les contraintes et triggers.
5. Réappliquer les autorisations/RLS, les paramètres Auth et le compartiment Storage privé ; vérifier que la cible contient toutes les données attendues et que les rôles de boutique sont cohérents.
6. **RLS validée en simulation SQL**. Reste à tester depuis le navigateur les connexions réelles, inscription, déconnexion, réparations, devis, factures et parcours super-admin **avant d'ouvrir l'accès public**.
7. Définir sur le Worker Cloudflare de production uniquement `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` et les secrets strictement serveur. Ne jamais exposer la clé privée dans le bundle navigateur. Vérifier la configuration Auth `Site URL`, les redirections et les e-mails.
8. Déployer la branche de migration **uniquement après validation des étapes précédentes et feu vert de bascule**. Maintenir un plan de retour arrière vers Lovable, sans écrire simultanément dans deux bases non synchronisées.

## 5. Validation en lecture seule à réaliser sur la cible

Utiliser `scripts/verify-production-migration.sql`, qui vérifie les totaux, les références utilisateurs et RLS sans divulguer de données individuelles.

**Ne pas exécuter les scripts SQL de migration en production sans contrôle d'une sauvegarde restaurable.** Conserver Lovable disponible tant que les vrais utilisateurs n'ont pas confirmé leur reconnexion.

Références techniques :
- [Migration des comptes Auth Supabase](https://supabase.com/kb/troubleshooting/migrating-auth-users-between-projects)
- [Sauvegarde/restauration Supabase](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)

## 6. Exécution de la bascule Cloudflare (pas encore lancée)

- Fichier `.github/workflows/deployer-production.yml` ajouté sur la branche de migration ; **déclenchement manuel uniquement** sur `main` après fusion validée. Confirmation textuelle `BASCULE_VALIDEE` obligatoire.
- Enregistrer dans les secrets GitHub Actions de l'environnement `production` : `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. **Ne pas écrire les valeurs dans GitHub, le chat, ni les fichiers du dépôt.**
- Le workflow bloque si l'URL Supabase n'est pas `https://xuvaihwygkcwriqfnkbg.supabase.co`.
- Après déploiement, vérifier en navigateur le domaine workers.dev réel du Worker `trade-in-pro`, puis configurer Supabase Auth (`Site URL`, redirections, e-mails) et contrôler les clients.
- Déploiement non lancé : aucun secret du nouveau Supabase n'a encore été configuré dans Cloudflare.
- Les comptes restaurés comprennent **11 adresses confirmées, 6 non confirmées**. **9 comptes** avaient un jeton Auth en attente dans la base source ; ces jetons temporaires n'ont volontairement pas été transférés. Prévoir de nouveaux liens de confirmation/récupération si nécessaire ; ne pas réutiliser les anciennes URL de vérification.
- Les deux fonctions de peuplement `seed_default_rules(uuid)` et `seed_default_services(uuid)` sont désormais **interdites aux rôles anonymes et authentifiés** ; `service_role` reste autorisé. Cette restriction est cohérente avec le code serveur et les migrations SQL.
- Derniers tests de cloisonnement : visiteur `anon` sans données ; membre d'une boutique limité à sa boutique ; rôle propriétaire vérifié. Aucun test réel de connexion utilisateur avec mot de passe n'a encore été exécuté depuis un navigateur.
- **Avant exécution du workflow**, geler brièvement les écritures de Lovable et refaire la comparaison complète, rattraper les nouvelles données et seulement ensuite ouvrir le domaine Cloudflare. Il est dangereux d'écrire simultanément dans les deux bases, car il n'y a pas de synchronisation en continu.

## Audit après restauration constatée — 20/11/2026

Les contrôles ont été réalisés en lecture seule sur la **source Lovable** et la cible `xuvaihwygkcwriqfnkbg`, sauf le test transactionnel RLS (simulation de JWT avec `ROLLBACK`), qui n'a conservé aucune écriture.

- **Données** : 24/24 tables avec le même nombre d'enregistrements **et la même empreinte du contenu de chaque ligne** (agrégation ordonnée des hachages des lignes JSONB). Cela comprend 14 boutiques, 11 profils, 8 clients, 9 estimations, 14 réparations et 10 factures.
- **Auth** : 17/17 utilisateurs et 17/17 identités ; UUID des utilisateurs, e-mails et hachages de mots de passe identiques. Trois champs de jetons d'authentification temporaires diffèrent ; aucun contenu sensible journalisé.
- **Intégrité de schéma** : 24 tables, 24 avec RLS ; 61 politiques, 17 fonctions, 18 triggers, 30 clés étrangères ; empreintes des politiques, fonctions, triggers et index **identiques** à la source.
- **Liens d'identité** : 0 profil orphelin, 0 rôle boutique orphelin, 0 rôle global orphelin.
- **Isolation** : un test transactionnel exécuté sous `authenticated` avec identité simulée d'une boutique a donné 3 clients visibles dans sa boutique, 0 dans une autre, et aucune visibilité sur la boutique étrangère. Ce n'est pas un test de connexion HTTP avec de vrais identifiants.
- **Storage** : compartiment privé `repair-photos` présent dans la destination, 0 fichier, comme dans la source ; le compartiment temporaire d'export présent dans Lovable n'a pas été copié, ce qui est normal.
- **Security Advisor de la cible** : 4 alertes à analyser, dont fonctions `SECURITY DEFINER` accessibles et protection contre les mots de passe compromis désactivée. Ne pas modifier les autorisations des fonctions sans vérifier leurs appels depuis l'application.
- **Cloudflare** : le Worker `quick-iphone-quote` existe, mais n'a actuellement que le binding `ASSETS`, sans URL/clé Supabase de production. Le Worker `trade-in-pro-staging` pointe toujours vers l'ancienne base staging maintenant en pause. **Aucune bascule publique et aucun changement des bindings Cloudflare.**

### Critères bloquants avant bascule

1. Effectuer une **véritable connexion** (e-mail + mot de passe existant), déconnexion, reconnexion et récupération de mot de passe sur la nouvelle cible ; vérifier e-mails et URL de redirection.
2. Tester l'inscription, les accès boutiques, l'édition client, les estimations, les réparations, la génération de factures et les liens de suivi.
3. Résoudre ou accepter après justification les avertissements Security Advisor pertinents ; revoir les privilèges `SECURITY DEFINER` exposés.
4. Préparer les variables Worker de production (clé publiable côté client, secrets strictement serveur), vérifier les domaines et URLs de callback.
5. Prévoir la synchronisation finale si des écritures surviennent sur Lovable après l'audit, puis préparer un plan de retour arrière testé.
6. Faire approuver et exécuter le déploiement public seulement après le feu vert des tests.

## Garde complémentaire de déploiement — 20/11/2026

Un audit du workflow a identifié que l'ancien ordre `wrangler deploy` puis `wrangler secret put` déployait des versions intermédiaires avec des secrets absents ou périmés. Correction préparée sur la PR #1 : `wrangler deploy --secrets-file` regroupe les 3 bindings et le code en un seul déploiement. Wrangler vérifie `secrets.required` dans `wrangler.jsonc`. Le fichier temporaire est généré uniquement dans le runner GitHub et supprimé. **Aucune bascule ni configuration réelle effectuée.**

Le parcours « mot de passe oublié » ne confirme plus l'envoi si l'API répond en erreur ; quatre tests unitaires couvrent réussite, erreur, limitation et panne réseau. Le vrai envoi Supabase Auth doit être validé séparément.
