# Audit Trade-In Pro — état actuel et plan d'amélioration

Audit uniquement : aucun fichier n'a été modifié. Les constats ci-dessous viennent de la lecture du code et de requêtes sur la base.

## 1) Ce qui existe réellement

- **Pages publiques** : accueil, connexion, inscription (avec création de la boutique), mot de passe oublié, réinitialisation.
- **Espace connecté** (protégé, redirige vers /connexion) : tableau de bord, nouvelle estimation, historique, clients (liste + fiche), réparations (liste, création, détail avec statuts et photos), factures, administration.
- **Administration** (réservée aux admins) : onglets Règles de déduction (ajout, modification, suppression, activation), Prestations, Prix, Boutique, Employés (invitation, changement de rôle, suppression).
- **Catalogue** : 30 modèles d'iPhone en base, avec couleurs, capacités et prix de base. Seulement 8 prix personnalisés boutique au total.
- **Moteur de calcul** : prix de base, puis prix boutique exact (modèle + couleur + capacité), sinon prix « toutes couleurs », sinon prix catalogue + supplément selon la capacité ; on retire les défauts cochés ; un blocage met le prix à 0. Le calcul tourne dans le navigateur et est **recalculé côté serveur** à l'enregistrement.
- **Isolation entre boutiques** : la protection est activée sur les 16 tables, toujours filtrée par la boutique de l'utilisateur. Les suppressions sensibles sont réservées à l'admin. Historiques et factures ne peuvent pas être modifiés.
- 8 boutiques et 5 estimations en base (2 boutiques ont des estimations).

## 2) Lacunes vérifiées

- **Aucun test automatisé** dans le projet (aucun fichier de test), alors que le calcul du prix est le cœur du produit.
- **Le serveur n'est pas le seul à pouvoir écrire certaines données** : les règles de la base permettent à un membre connecté d'insérer directement une estimation ou une facture avec un montant libre. Les écritures normales passent bien par le serveur, mais ce raccourci reste ouvert.
- **Numéros de dossiers et de factures** : on lit le dernier numéro puis on ajoute 1, sans verrou. Deux créations en même temps peuvent donner le même numéro ou un échec.
- **Lien Administration** : il disparaît pendant le chargement ou si la boutique n'arrive pas à se charger, sans aucun message d'erreur (déjà diagnostiqué, pas corrigé).
- **Prix boutique quasi vides** (8 lignes) : la plupart des estimations utilisent donc le prix catalogue par défaut + le supplément de capacité, qui est codé en dur à deux endroits (dans le code et en base).
- **Pas de suivi des actions admin** (qui a modifié une règle ou un prix, et quand).
- **Pas d'abonnement ni de limites** par boutique, alors que l'objectif est un SaaS vendu sur abonnement.
- **Multi-marques** : prévu dans la structure (champ marque), mais pas d'interface pour gérer d'autres marques ou modèles (catalogue en lecture seule).
- **Responsive / pages d'erreur** : non vérifiés visuellement dans cet audit. Il reste à les tester sur mobile.

## 3) Risques prioritaires

1. Montants falsifiables (estimations / factures) en passant à côté du serveur : risque juridique et financier.
2. Numéros de factures en double ou manquants : problème de conformité comptable.
3. Aucun test sur le calcul du prix : un bug passerait inaperçu.
4. L'admin perd l'accès à l'administration dès que le chargement de la boutique échoue : impression de produit cassé.

## 4) Plan d'amélioration

**P0 — sécurité et fiabilité**
- Fermer l'écriture directe des estimations, défauts d'estimation et factures depuis le navigateur ; seules les actions serveur vérifiées peuvent les créer.
- Numéros de dossiers et factures fiables : un compteur par boutique et par année, géré dans la base de façon atomique, avec une contrainte d'unicité.
- Tests du moteur de calcul : déductions, blocage → 0 €, prix jamais négatif, ordre de priorité des prix (exact > toutes couleurs > catalogue), suppléments de capacité.
- Lien Administration : afficher un état de chargement et un message clair en cas d'erreur, et réessayer automatiquement.

**P1 — qualité produit**
- Grille de prix complète : remplissage en masse par modèle, import/export CSV, alerte « prix par défaut utilisé » dans l'estimation.
- Journal des actions admin (règles, prix, prestations, employés).
- Historique : filtres (date, employé, modèle), export CSV, fiche détaillée imprimable/PDF pour le client.
- Vérification mobile et tablette de toutes les pages, avec des pages d'erreur et des messages vides homogènes.

**P2 — croissance SaaS**
- Abonnements et limites par boutique (paiement en ligne).
- Gestion du catalogue multi-marques (Samsung, Pixel…) par un super-admin.
- Statistiques : marge, prix moyen, défauts les plus fréquents.

## 5) Première amélioration recommandée

Le **P0 sécurité des montants** : bloquer l'écriture directe des estimations et factures, et ajouter la numérotation atomique, avec des tests du calcul. C'est petit, sans impact visible pour les vendeurs, et c'est ce qui protège la valeur légale des prix et des factures.

## Détails techniques

- Retirer les policies INSERT `authenticated` sur `estimations`, `estimation_defects` et `invoices`. Les insertions passent par `supabaseAdmin` dans les server functions, une fois l'appelant et sa boutique vérifiés (`saveEstimation` et `generateInvoiceFor` lisent déjà le profil).
- Créer une table `shop_counters(shop_id, kind, year, value)` et une fonction SQL `next_reference(kind)` en security definer (`UPDATE ... RETURNING`), plus `UNIQUE(shop_id, reference)` et `UNIQUE(shop_id, number)`. Remplacer `nextSequence` par cette fonction.
- Tests Vitest dans `src/lib/pricing.test.ts`, et sortir le choix du prix de base de `estimation.tsx` vers une fonction pure `resolveBasePrice`, partagée avec le serveur.
- Dans `AppShell` : gérer `isLoading` / `isError` de `useWorkspace`.
