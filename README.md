# Trade-In Pro

PROMPT – Développement d'un logiciel SaaS d'estimation de reprise d'iPhone

Je souhaite que tu agisses comme un architecte logiciel senior, UX/UI Designer et développeur Full Stack afin de concevoir un logiciel SaaS moderne, professionnel, évolutif et prêt à être commercialisé.

Ne crée pas un simple prototype. Je souhaite une véritable application professionnelle avec une architecture propre, un code maintenable et une interface haut de gamme.

Présentation du projet

Le projet consiste à créer un logiciel SaaS destiné aux boutiques de réparation et de reprise d'iPhone.

La première version sera 100 % dédiée aux iPhone.

L'objectif est de permettre à un vendeur d'effectuer une estimation complète en moins de deux minutes sans devoir contacter un responsable.

Le logiciel devra calculer automatiquement le prix de reprise selon des règles définies par chaque boutique.

Chaque boutique possède son propre espace sécurisé.

Chaque boutique possède ses propres paramètres.

Chaque boutique possède ses propres règles de déduction.

Style graphique

Je souhaite une interface très moderne.

Inspirations :

Apple

Stripe

Linear

Notion

Je veux un design :

minimaliste

élégant

responsive

rapide

fluide

professionnel

Utiliser des animations discrètes.

Le logiciel doit donner l'impression d'utiliser une application premium.

Pages du logiciel

Landing Page

Créer une page d'accueil présentant le logiciel.

Elle doit contenir :

logo

nom du logiciel

présentation

fonctionnalités

captures d'écran (placeholders)

bouton Se connecter

bouton Créer un compte

Connexion

Créer une page moderne comprenant :

adresse e-mail

mot de passe

mot de passe oublié

bouton connexion

Création de compte

Une boutique doit pouvoir créer son espace.

Informations :

Nom de la boutique

Adresse

Téléphone

Email

Nom de l'administrateur

Mot de passe

Une fois inscrit :

Créer automatiquement l'espace boutique.

Tableau de bord

Après connexion :

Afficher :

nombre d'estimations aujourd'hui

nombre d'estimations ce mois

dernières estimations

bouton Nouvelle estimation

Module principal

Créer un module permettant d'effectuer une estimation d'un iPhone.

Le vendeur choisit :

modèle

couleur

capacité

Puis il renseigne les différents éléments de l'appareil.

Informations générales

Sélection :

Modèle

Couleur

Stockage

Champ facultatif :

IMEI

État esthétique

Pouvoir évaluer :

écran

vitre arrière

châssis

Vérifications techniques

Pouvoir sélectionner :

Batterie

Face ID

True Tone

Caméra avant

Caméra arrière

Flash

Micro

Haut-parleur

Écouteur

Charge

Wi-Fi

Bluetooth

NFC

Réseau

Boutons

Vibreur

Blocages

Créer une section spécifique.

Ajouter :

iPhone bloqué iCloud

Activation Lock

Compte Apple toujours présent

SS06 détecté

Ces blocages sont indépendants des autres règles.

Ils peuvent bloquer automatiquement la reprise.

Calcul automatique

Le logiciel possède un prix de base.

Ensuite il applique automatiquement les règles de déduction.

Exemple :

Prix de base :

650 €

Écran rayé :

-20 €

Batterie faible :

-30 €

Face ID HS :

-100 €

Prix final :

500 €

Le calcul doit être instantané.

Administration

Créer un panneau Administrateur.

L'administrateur doit pouvoir gérer entièrement le logiciel.

Règles de déduction

Les règles de déduction doivent être 100 % personnalisables.

Aucune règle ne doit être codée directement dans le logiciel.

Je veux une indépendance totale.

L'administrateur doit pouvoir :

Ajouter une règle

Modifier une règle

Supprimer une règle

Activer/Désactiver une règle

Chaque règle possède :

Nom

Déduction en euros

Statut

Exemple :

Nom :

Micro faible

Déduction :

-20 €

Une fois enregistrée :

La règle apparaît automatiquement dans le formulaire d'estimation.

Sans modifier le code.

Historique

Toutes les estimations doivent être sauvegardées.

Chaque estimation contient :

Date

Employé

Modèle

Couleur

Stockage

Défauts

Prix proposé

Base de données des modèles d'iPhone

Le logiciel doit intégrer automatiquement tous les modèles suivants :

iPhone X

iPhone XS

iPhone XS Max

iPhone XR

iPhone 11

iPhone 11 Pro

iPhone 11 Pro Max

iPhone SE (2020)

iPhone 12 mini

iPhone 12

iPhone 12 Pro

iPhone 12 Pro Max

iPhone 13 mini

iPhone 13

iPhone 13 Pro

iPhone 13 Pro Max

iPhone SE (2022)

iPhone 14

iPhone 14 Plus

iPhone 14 Pro

iPhone 14 Pro Max

iPhone 15

iPhone 15 Plus

iPhone 15 Pro

iPhone 15 Pro Max

iPhone 16e

iPhone 16

iPhone 16 Plus

iPhone 16 Pro

iPhone 16 Pro Max

Pour chaque modèle, intégrer :

toutes les couleurs officielles

toutes les capacités de stockage officielles

Lorsque le vendeur sélectionne un modèle :

afficher uniquement les couleurs compatibles

afficher uniquement les capacités compatibles

Le prix de base doit être associé automatiquement à la combinaison :

Modèle + Couleur + Stockage

Contraintes techniques

Le projet doit être pensé comme un véritable SaaS.

Architecture propre.

Code modulaire.

Code évolutif.

Code documenté.

Bonne séparation Front-End / Back-End.

Base de données normalisée.

API propre.

Authentification sécurisée.

Permissions utilisateurs.

Évolutivité

Le logiciel doit être conçu dès le départ pour permettre l'ajout futur :

Samsung

Google Pixel

Xiaomi

Huawei

Oppo

Honor

sans modifier toute l'architecture.

Objectif final

Je veux obtenir un logiciel professionnel destiné aux boutiques de réparation, pensé par un réparateur pour des réparateurs.

L'application doit être intuitive, rapide, premium et suffisamment robuste pour être commercialisée sous forme d'abonnement SaaS auprès de plusieurs boutiques.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://quick-iphone-quote.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/381a2a77-9166-4c0a-9a21-37215e022f9d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
