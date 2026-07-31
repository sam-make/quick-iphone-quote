# Module Clients & Réparations

Ajout d'un module complet de gestion clients / dossiers de réparation / facturation, dans le design actuel, sans toucher au module Estimation.

## Périmètre fonctionnel

### Clients
- Liste des clients avec recherche instantanée (nom, prénom, téléphone).
- Fiche client : nom, prénom, téléphone, e-mail, adresse, notes internes.
- Anti-doublon : le téléphone est unique par boutique. Si le numéro existe déjà, le logiciel propose la fiche existante au lieu d'en créer une seconde.
- Onglets de la fiche : Réparations, Factures, Appareils enregistrés.

### Nouvelle réparation (assistant en 5 étapes)
1. Client : recherche d'un client existant ou création rapide d'une nouvelle fiche.
2. Appareil : marque, modèle, couleur, capacité, IMEI, code de déverrouillage, état général, description de la panne. Les appareils déjà connus du client sont proposés en un clic.
3. Prestations : sélection multiple dans le catalogue configurable, avec quantité et prix modifiable ponctuellement, plus une ligne « réparation personnalisée ». Total et durée estimée calculés en direct.
4. Photos : dépôt de photos classées Avant / Pendant / Après.
5. Validation : récapitulatif puis création du dossier au statut « Reçu ».

### Suivi
- Page dossier : informations client/appareil, prestations, total, photos, journal des statuts, facture liée.
- Statuts : Reçu, Diagnostic, En attente de validation client, En attente de pièce, En réparation, Tests en cours, Terminé, Restitué, Annulé.
- Chaque changement de statut enregistre date, heure, employé et commentaire optionnel.
- Vue liste des réparations filtrable par statut, client, période.

### Facturation
- Génération d'une facture depuis un dossier terminé : numéro séquentiel par boutique (FA-AAAA-0001), infos boutique, client, appareil, lignes de prestations (prix unitaire, quantité, total), date.
- Aperçu imprimable, export PDF via l'impression navigateur, archivage automatique dans la fiche client.

### Administration
- Nouvel onglet « Prestations » : créer, modifier, activer/désactiver, supprimer une prestation (nom, prix, durée estimée, catégorie, description).
- Aucun tarif ni libellé codé en dur : la boutique reçoit un catalogue initial (écran, batterie, connecteur de charge, caméras, haut-parleur, micro, vibreur, vitre arrière, châssis, boutons, Face ID, carte mère, désoxydation, diagnostic, mise à jour, réinstallation iOS, transfert de données, nettoyage interne) qu'elle peut entièrement modifier.
- Onglet « Boutique » complété (nom, adresse, téléphone, e-mail) car ces données apparaissent sur les factures.

## Détails techniques

### Base de données (nouvelles tables, isolées par boutique via RLS)
- `customers` — identité, contact, notes, `shop_id`, unicité `(shop_id, phone)`.
- `customer_devices` — marque, modèle, couleur, capacité, IMEI, code de déverrouillage, rattaché au client. Champs texte libres + marque : ouvre la voie à Samsung, Pixel, Xiaomi… sans refonte.
- `repair_services` — catalogue configurable par boutique (nom, prix, durée en minutes, catégorie, description, actif, ordre).
- `repairs` — dossier : client, appareil, employé, état général, panne, statut, totaux figés, référence lisible.
- `repair_items` — lignes de prestations avec libellé, prix unitaire et quantité figés au moment de la création.
- `repair_status_history` — statut, auteur, horodatage, commentaire.
- `repair_photos` — chemin de stockage, phase (avant/pendant/après).
- `invoices` — numéro, dossier, client, totaux, date d'émission, snapshot boutique/client.
- Bucket de stockage privé `repair-photos`, accès restreint aux membres de la boutique.
- Grants + RLS sur chaque table : lecture/écriture pour les membres de la boutique, suppression réservée à l'administrateur, catalogue de prestations modifiable par l'administrateur uniquement.

### Application
- Server functions (`src/lib/repairs.functions.ts` + `repairs.server.ts`) pour : recherche/création client, création de dossier avec calcul serveur des totaux, changement de statut, génération de facture. Prix recalculés côté serveur, jamais fait confiance au client.
- Composants découpés : `CustomerSearchStep`, `DeviceStep`, `ServicesStep`, `PhotosStep`, `ReviewStep`, `RepairStatusTimeline`, `InvoiceDocument`.
- Nouvelles routes sous `_authenticated/` : `clients`, `clients/$id`, `reparations`, `reparations/nouvelle`, `reparations/$id`, `factures/$id`.
- Navigation : ajout des entrées « Clients » et « Réparations » dans la barre latérale existante.
- Réutilisation stricte des tokens et composants UI actuels ; aucun fichier du module Estimation modifié.

## Livraison
1. Migration base de données + stockage + catalogue initial de prestations.
2. Server functions et logique métier.
3. Écrans Clients.
4. Assistant Nouvelle réparation + suivi.
5. Facturation et onglet Administration des prestations.
