# Équipe d'agents de préparation à la production

## Portée et réalité d'exécution

Les six fichiers `.codex/agents/*.toml` sont des **vrais rôles de sous-agents Codex**, chargés lorsque le dépôt est ouvert dans Codex. Ils ne sont ni des services cloud permanents, ni des agents en activité tant qu'aucune session Codex n'est lancée.
Les contrôles sans IA sont réalisés par GitHub Actions; ne pas confondre contrôle automatique et résultat d'audit métier.
Le coordinateur principal est le Codex qui reçoit la tâche; il consolide les avis et n'autorise jamais lui-même un déploiement non vérifié.

## Orchestration recommandée

1. Faire travailler en parallèle **security_auditor**, **data_migration**, **auth_specialist**, **qa_engineer**, **repairer_ux** et **release_engineer** sur l'état actuel de la PR 1, **en lecture seule** initialement.
2. Attendre les six rapports; chaque agent rend PASSÉ / ÉCHEC / NON VÉRIFIÉ avec chemins et preuves, gravité P0/P1/P2 et actions restantes.
3. Prioriser P0, puis P1. Le coordinateur assigne les correctifs non concurrents, intègre les changements sur `migration-cloudflare`, teste et met à jour NOTES.md et la documentation.
4. Réexécuter les tests GitHub et les audits avant de retirer un blocage. Une seule personne/agent fusionne les correctifs; les autres contrôlent.
5. Maintenir la PR en brouillon et la production Lovable en état de fonctionnement tant que le tableau GO/NO-GO n'est pas entièrement validé.

## Faits techniques établis le 20 novembre 2026

- GitHub : `sam-make/trade-in-pro`, branche `migration-cloudflare`, PR n°1.
- Base en service : Supabase dans Lovable Cloud; base autonome : `xuvaihwygkcwriqfnkbg`.
- Snapshot déjà copié sur la cible : 24/24 tables métier concordantes, 17 comptes et identités, UUID et hachages conformes.
- Les simulations SQL RLS ont fonctionné, mais **aucune connexion réelle avec mot de passe existant n'est validée**.
- Le dump utilisateur est privé et ne doit jamais être stocké dans le dépôt.
- La source Lovable peut encore évoluer; pas de synchronisation continue.
- Les avertissements du Security Advisor et l'email de réinitialisation doivent encore être vérifiés.

## Critères de GO (tous indispensables)

| Critère | Responsable | État initial |
| --- | --- | --- |
| Identité, mots de passe, redirections et e-mails testés en conditions réelles | auth_specialist | NON VÉRIFIÉ |
| 24 tables et Auth sans dérive juste avant bascule, gel des écritures | data_migration | NON VÉRIFIÉ (instantané seulement) |
| Accès multi-boutiques, RLS, privilèges et secrets | security_auditor | PARTIEL (RLS simulée, alertes) |
| Devis, clients, réparations, factures, scénarios d'erreur | qa_engineer | NON VÉRIFIÉ de bout en bout |
| Parcours mobile/ergonomie boutique | repairer_ux | NON VÉRIFIÉ en navigateur réel |
| Worker, bindings, CI, observabilité et retour arrière | release_engineer | PARTIEL (workflow manuel existant) |
| Approbation explicite de la bascule publique | coordinateur + propriétaire | NON ACQUISE |

## Ordre de livraison

- **P0** : vérifier authentification réelle et récupérations e-mail sur le nouveau projet.
- **P0** : contrôler Security Advisor et usage des fonctions `SECURITY DEFINER` sans casser les RLS.
- **P0** : tests fonctionnels critiques et parcours mobile.
- **P0** : procédure de synchronisation finale des modifications réalisées sur Lovable.
- **P1** : configurer la préproduction Cloudflare isolée, puis les secrets de production côté serveur par un canal protégé.
- **Dernier** : GO/NO-GO, déploiement après accord explicite et plan de retour arrière.

## Exemple d'instruction au coordinateur dans Codex

> Travaille sur `migration-cloudflare`. Lance en parallèle les six sous-agents définis dans `.codex/agents/` et attends leurs rapports. Consolide les constats P0/P1, corrige uniquement les points pouvant être testés sans toucher au site Lovable ni aux comptes des boutiques. Exécute les tests, actualise NOTES.md et conserve la PR 1 en brouillon. Aucun déploiement public ni changement irréversible sans nouveau feu vert.

Ne pas utiliser `--yolo` et ne pas croire qu'une instruction écrite dans le TOML crée à elle seule une restriction d'autorisation : les permissions réelles viennent de la session parent et des contrôles de CI.
