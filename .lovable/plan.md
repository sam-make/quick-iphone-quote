# Plan d'audit priorisé — Trade-In Pro (lecture seule)

Ce plan décrit l'audit à mener. Il ne modifie aucun fichier, ne déploie rien et n'ajoute aucun service payant. Aucun blocage lié aux crédits n'est constaté pour cette demande. Les points ci-dessous sont des vérifications à faire : leur résultat n'est pas encore confirmé.

## Priorité 1 — Fiabilité du calcul des estimations

**À examiner**
- `src/lib/pricing.ts` : `resolveBasePrice`, `computePrice`, `storageStep`
- `src/lib/pricing.test.ts` : couverture actuelle
- `src/routes/_authenticated/estimation.tsx` : calcul dans le navigateur
- Fonction serveur d'enregistrement d'une estimation (`saveEstimation`, dans `src/lib/workspace.server.ts` ou un fichier voisin) : le calcul refait côté serveur
- Fonction SQL `storage_step` : doit donner le même résultat que `storageStep`

**Risques concrets**
- Le navigateur et le serveur ne calculent pas pareil, par exemple si les règles ne sont pas filtrées de la même façon (actives, de la même boutique).
- Le serveur accepte des identifiants de règles d'une autre boutique, ou des règles désactivées.
- Le supplément de capacité est différent entre le code et la base.
- Des valeurs limites mal gérées : déduction négative, prix boutique à 0, capacité inconnue, modèle désactivé.

**Vérifications**
1. Lire la fonction serveur et vérifier qu'elle relit le prix et les règles depuis la base, filtrés par boutique, et qu'elle ignore tout montant envoyé par le navigateur.
2. Comparer `storage_step` et `storageStep` pour 64, 128, 256, 512 et 1024 Go (requête de lecture seule).
3. Lister les cas manquants dans les tests : règle d'une autre boutique, règle inactive, déduction négative, prix « toutes couleurs » face au prix exact, blocage.
4. Lancer `bun run test` et noter le résultat.

## Priorité 2 — Sécurité de la base et isolation entre boutiques

**À examiner**
- `drizzle/migrations/*.sql` (dont `0001_phase1b_lock_repair_writes.sql`)
- Les règles d'accès et les droits sur les 17 tables (requêtes sur `pg_policies` et sur `information_schema.role_table_grants`)
- Les fonctions `current_shop_id`, `has_role`, `next_shop_reference`, `seed_default_*` : appelant autorisé, `search_path`, droit d'exécution
- `scripts/check-direct-writes.py`
- `src/lib/team.server.ts` : invitation, changement de rôle, suppression
- `src/lib/workspace.server.ts` : rattachement d'un invité à une boutique

**Risques concrets**
- Le rattachement par invitation se fie à `invited_shop_id` dans les métadonnées : vérifier qu'un utilisateur ne peut pas modifier ses propres métadonnées pour rejoindre une autre boutique (risque élevé à confirmer).
- Un admin peut changer son propre rôle ou supprimer le dernier admin de la boutique.
- Une fonction en security definer est exécutable par `anon`, ou n'est pas limitée à la boutique de l'appelant.
- `profiles` : un utilisateur peut modifier son propre `shop_id`.
- Le stockage des photos n'est pas cloisonné par boutique.
- `device_models` est en lecture pour tous : à confirmer que c'est voulu.

**Vérifications**
1. Pour chaque table, faire un tableau : opérations autorisées, rôles concernés, filtre de boutique.
2. Vérifier que `profiles` interdit la modification de `shop_id`, et que `user_roles` n'accepte aucune écriture depuis le navigateur.
3. Lire les règles d'accès de `storage.objects` pour le dossier des photos.
4. Lancer le linter de sécurité et `scripts/check-direct-writes.py`.
5. Avec deux comptes test de boutiques différentes, faire des lectures croisées en lecture seule, sur une copie de travail isolée seulement, pour ne pas toucher aux données réelles.

## Priorité 3 — Réparations et factures

**À examiner**
- `src/lib/repairs.server.ts`, `src/lib/repairs.functions.ts`, `src/lib/repairs.ts` (`totalsOf`)
- `src/routes/_authenticated/reparations.nouvelle.tsx`, `reparations.$id.tsx`, `factures.$id.tsx`
- `src/components/repairs/ServicesStep.tsx`, `src/lib/repair-photos.ts`

**Risques concrets**
- `changeStatusFor` accepte n'importe quel passage d'un statut à un autre, y compris après « restitué » ou « annulé ».
- `generateInvoiceFor` : deux clics en même temps peuvent créer deux factures, faute de contrainte d'unicité sur `repair_id` (à vérifier).
- Facture créée pour une réparation annulée ou pas encore terminée.
- Le total de la facture est recalculé à partir des lignes au lieu de reprendre `total_price` : il peut y avoir un écart.
- Une création partielle (réparation sans lignes, ou historique manquant) si l'une des étapes échoue.
- Un appareil existant réattribué à un autre client.
- Un numéro consommé puis perdu si l'insertion échoue : un trou dans la numérotation des factures, à évaluer pour la conformité.

**Vérifications**
1. Vérifier les contraintes d'unicité sur `invoices(repair_id)`, `invoices(shop_id, number)` et `repairs(shop_id, reference)`.
2. Faire la liste des passages de statut autorisés, et dire lesquels devraient être interdits.
3. Vérifier, par une requête de lecture, que chaque facture a le même total que sa réparation et que les numéros se suivent.
4. Relire les messages d'erreur et les cas de nouvelle tentative dans les pages.

## Livrable de l'audit

Pour chaque point : constaté ou écarté, avec le fichier et la ligne en preuve, une gravité (critique, élevée, moyenne, faible) et la correction proposée. Aucune correction ne sera appliquée sans votre accord.

## Détails techniques

- Requêtes en lecture seule uniquement : `pg_policies`, `pg_proc` (`prosecdef`, `proconfig`, `proacl`), `information_schema.role_table_grants`, `pg_constraint`.
- Les tests à ajouter plus tard iraient dans `src/lib/pricing.test.ts` et dans un nouveau fichier `src/lib/repairs.test.ts` (pour `totalsOf` et les passages de statut).
