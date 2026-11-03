# Espace Super Administrateur — Trade-In Pro

## Diagnostic confirmé
- L’adresse **haddaouisamy86@gmail.com** possède déjà un compte Auth dont l’e-mail est confirmé, avec un profil et un rôle administrateur de boutique.
- L’administration actuelle est propre à chaque boutique ; aucun rôle global, état de suspension ou journal d’audit global n’existe.
- Les écritures sensibles de réparation, estimation et facture sont déjà réservées aux fonctions serveur. Les accès ordinaires utilisent les règles de cloisonnement et les contrôles de rôle existants.
- Les règles de déduction et prix sont spécifiques aux boutiques. Aucun réglage global de maintenance n’a été identifié : ne pas inventer des interrupteurs sans effet ni modifier les prix actuels.

## Résultat prévu
1. Ajouter **/admin**, accessible après connexion, avec un lien « Super Administration » visible uniquement pour le propriétaire autorisé ; conserver « Administration » pour la gestion de sa boutique.
2. Afficher les nombres globaux de boutiques, profils utilisateurs, réparations et estimations, ainsi que l’activité récente. Présenter les listes avec recherche, filtres, pagination et détails, sur iPhone et ordinateur.
3. Permettre au propriétaire de modifier les coordonnées d’une boutique et de la suspendre/réactiver. Une suspension bloque ses accès métier, y compris les appels directs, sans modifier ses données.
4. Afficher les profils et leurs rôles de boutique ; permettre de modifier uniquement les rôles existants **admin / employee** et de suspendre/réactiver un accès. Empêcher de désactiver le propriétaire ou de retirer le dernier administrateur actif d’une boutique.
5. Présenter les réglages réellement existants et les règles de reprise en distinguant clairement catalogue commun et réglages de chaque boutique. Ne pas écraser les personnalisations ; ne pas ajouter de maintenance globale tant qu’aucun mécanisme réel n’existe.
6. Ajouter un journal durable pour chaque action sensible : acteur, action, cible, date et changements utiles, sans secrets ni mots de passe. Les changements et leurs événements d’audit sont enregistrés ensemble.

## Suppression et publication
- **Aucune suppression définitive** : votre interdiction de supprimer des données existantes prime. Proposer un archivage réversible avec confirmation renforcée et avertissement sur les données liées ; l’appeler « Archiver », jamais « Supprimer ».
- Aucun changement à Stripe ou aux abonnements.
- Préparer l’accès pour la prochaine version publiée, mais **ne pas publier dans cette intervention**. La version déjà en ligne ne peut pas afficher un nouvel écran avant publication.

## Sécurité et détails techniques
- Ajouter une table protégée de rôles globaux, distincte des rôles de boutique, sans droit d’écriture pour les utilisateurs ordinaires ; rôle global `super_admin` uniquement.
- Attribuer le rôle exclusivement côté serveur au compte existant après contrôle de son identité Auth réelle et de son e-mail confirmé exact. Ne jamais utiliser une adresse reçue du navigateur, le profil modifiable ou `user_metadata`.
- Revalider à chaque opération globale l’utilisateur Auth, l’e-mail confirmé autorisé et son rôle protégé. Charger le client privilégié uniquement après autorisation, dans les traitements serveur.
- Conserver les politiques de boutique sans leur ajouter d’accès global. Les opérations globales passent par des fonctions serveur dédiées avec entrées validées et projections explicites.
- Ajouter les états de suspension/archivage sans retirer de colonnes ni données ; les colonnes sensibles ne doivent jamais être modifiables directement par un membre de boutique.
- Faire appliquer les suspensions par les contrôles serveur **et** les politiques RLS, notamment les chemins de lecture et d’écriture directs, les photos et les sessions déjà ouvertes. Conserver le suivi public à jeton secret en lecture seule pour ne pas casser les liens clients existants.
- Ajouter une route protégée `src/routes/_authenticated/admin.tsx`, des modules dédiés de fonctions serveur et des composants réutilisant le design actuel ; exclure cet espace du sitemap et de l’indexation.
- Appliquer les évolutions de schéma avec l’outil de migration, vérifier les droits explicites, les politiques et les changements effectivement présents en base.

## Vérifications et compte rendu
- Tests ciblés : propriétaire vérifié accepté ; autre e-mail, compte non vérifié, métadonnées falsifiées et rôle manquant refusés ; promotion vers `super_admin` impossible depuis le navigateur.
- Vérifier en navigateur connecté l’ouverture de /admin, ses listes, un changement réversible puis son rétablissement et sa trace d’audit ; vérifier aussi un compte boutique ordinaire refusé.
- Tester les appels serveur directs sans rôle, les écritures directes interdites, les suspensions avec session existante et l’isolation inter-boutiques.
- Exécuter les tests existants et inspecter les erreurs de compilation ; contrôler les écrans sur téléphone et ordinateur.
- Si la session d’un compte nécessaire au test exige une autorisation, la demander plutôt que contourner l’authentification. Rapporter les tests impossibles comme non vérifiés.
- Fournir un compte rendu des fichiers et évolutions de base, des contrôles réellement effectués, des limites et de l’accès du propriétaire par sa connexion habituelle, sans nouveau mot de passe.