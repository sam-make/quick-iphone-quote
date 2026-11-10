# Analytics — contrôles réalisés

- 59 tests automatiques réussis, dont 7 nouveaux tests : seuils 7/14/30 jours, périodes 7/30/90 jours, activité inconnue distincte, fréquence et classement.
- Compte propriétaire vérifié : Analytics ouvert avec 13 boutiques ; période 7 jours, graphiques barres, fiche boutique, filtre boutique fonctionnels ; aucun débordement global à 390 × 710, aucune erreur JavaScript.
- Compte boutique ordinaire : /admin refusé, appel serveur Analytics refusé, RPC Analytics refusé, lecture directe des présences vide, écriture directe inter-boutique refusée ; présence serveur propre enregistrée.
- Sans session : RPC Analytics et présence refusés.
- Deux tables présentes, RLS SELECT réservée au rôle propriétaire et aucun droit direct INSERT pour authenticated.
- Compilation automatique : build OK après dernier changement.
- Aucune création de dossier métier, aucune suppression, aucune publication. Les tests enregistrent des présences de test authentifiées dans le nouveau suivi.

## Limites
Les données historiques sont celles des créations et statuts conservés ; visites et objets supprimés antérieurs inconnus. La dernière connexion est le maximum Auth des membres actuels, pas un historique de connexions. Les présences mesurées démarrent à l’installation. Le journal garde les 200 activités les plus récentes de la période, la fiche en affiche au maximum 50 ; filtrer la boutique pour charger son historique dédié. L’activité n’est pas un statut d’accès : boutiques suspendues/archivées restent signalées séparément.

Le chantier animations antérieur reste hors périmètre de cette demande.