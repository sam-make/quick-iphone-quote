import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout, LegalSection, Missing } from "@/components/legal/LegalLayout";

export const Route = createFileRoute("/cgv")({
  head: () => ({
    meta: [
      { title: "Conditions générales de vente — Trade-In Pro" },
      {
        name: "description",
        content:
          "Conditions générales de vente de l’abonnement Trade-In Pro : offre unique à 10,99 €/mois, résiliation et droits.",
      },
      { property: "og:title", content: "Conditions générales de vente — Trade-In Pro" },
      {
        property: "og:description",
        content: "Offre unique 10,99 €/mois toutes fonctionnalités incluses, modalités de résiliation et garanties.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CgvPage,
});

function CgvPage() {
  return (
    <LegalLayout title="Conditions générales de vente" updated="25 octobre 2026">
      <LegalSection title="1. Objet">
        <p>
          Les présentes conditions régissent la souscription et l’utilisation du service Trade-In
          Pro, un logiciel en ligne (SaaS) destiné aux boutiques de réparation et de reprise de
          téléphones : estimations de reprise, gestion des réparations, des clients et de la
          facturation.
        </p>
        <p>
          Éditeur : <Missing>raison sociale, SIRET et adresse — reprise des mentions légales</Missing>
        </p>
      </LegalSection>

      <LegalSection title="2. Offre et prix">
        <p>
          Une seule offre : <strong>Trade-In Pro à 10,99 € par mois, taxes incluses</strong>. Toutes
          les fonctionnalités sont incluses, sans limitation de volume ni option payante
          supplémentaire. Aucun autre forfait n’est proposé.
        </p>
        <p>
          Le prix s’entend toutes taxes comprises (TVA applicable incluse). Les boutiques créées
          avant le 26 octobre 2026 bénéficient d’une période de transition gratuite jusqu’au
          25 novembre 2026, après laquelle un abonnement est nécessaire. Toute évolution
          tarifaire future serait annoncée avant application et ne concernerait que les périodes
          suivantes.
        </p>
      </LegalSection>

      <LegalSection title="3. Souscription et paiement">
        <p>
          La souscription s’effectue en ligne depuis l’espace de la boutique, par un administrateur
          de celle-ci. Le paiement est traité par Stripe ; les données bancaires ne transitent
          jamais par nos serveurs. Le paiement est encaissé par Stripe en qualité de revendeur
          (gestion des taxes, de la fraude et des litiges) et apparaît sur le relevé bancaire sous
          un libellé « LINK.COM ».{" "}
          <Missing>rôle de Stripe comme revendeur et émetteur des reçus à faire valider par un conseil juridique</Missing>
        </p>
        <p>
          L’abonnement est facturé mensuellement, à date anniversaire de la souscription, par
          prélèvement automatique sur le moyen de paiement enregistré.
        </p>
      </LegalSection>

      <LegalSection title="4. Durée et résiliation">
        <p>
          L’abonnement est sans engagement de durée : il peut être résilié à tout moment depuis le
          portail de facturation accessible dans l’espace « Abonnement ».
        </p>
        <p>
          En cas de résiliation, l’accès au service est conservé jusqu’à la fin de la période
          mensuelle déjà payée. Aucun remboursement au prorata n’est dû pour la période en cours.
        </p>
        <p>
          Les données de la boutique (clients, réparations, estimations, factures) sont conservées
          après résiliation et ne sont pas supprimées automatiquement ; leur export ou suppression
          peut être demandé auprès du support. <Missing>délai de conservation après résiliation</Missing>
        </p>
      </LegalSection>

      <LegalSection title="5. Échec de paiement">
        <p>
          En cas d’échec de prélèvement, le paiement est automatiquement retenté par Stripe.
          L’accès au service est maintenu jusqu’à la fin de la période mensuelle déjà payée. Si le
          paiement n’est pas régularisé à cette date, les fonctionnalités sont suspendues jusqu’à
          la régularisation ou à une nouvelle souscription ; les données de la boutique sont
          conservées.
        </p>
      </LegalSection>

      <LegalSection title="6. Droit de rétractation">
        <p>
          Conformément au code de la consommation, le client professionnel ne bénéficie pas du
          droit de rétractation pour les services numériques. Pour un souscripteur consommateur,
          le droit de rétractation de 14 jours s’applique sauf renonciation expresse pour un accès
          immédiat au service. <Missing>formulation à valider par un conseil juridique</Missing>
        </p>
      </LegalSection>

      <LegalSection title="7. Responsabilité">
        <p>
          L’éditeur s’engage à fournir le service avec diligence. Le service est un outil d’aide :
          les prix de reprise, estimations et marges calculés restent sous la responsabilité de la
          boutique, qui fixe seule ses conditions commerciales envers ses propres clients.
        </p>
        <p>
          L’éditeur ne saurait être tenu responsable des dommages indirects (perte d’exploitation,
          manque à gagner) ni des conséquences d’une mauvaise utilisation du service.
        </p>
        <p>
          La boutique est responsable des comptes de ses employés, de l’exactitude des données
          qu’elle saisit et du respect de ses propres obligations envers ses clients (information,
          facturation, protection des données).{" "}
          <Missing>clause de limitation de responsabilité à faire valider par un conseil juridique</Missing>
        </p>
      </LegalSection>

      <LegalSection title="8. Données personnelles">
        <p>
          Le traitement des données personnelles est décrit dans la{" "}
          <a href="/confidentialite" className="text-primary underline">
            politique de confidentialité
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="9. Litiges et droit applicable">
        <p>
          Les présentes conditions sont soumises au droit français. En cas de litige, une solution
          amiable sera recherchée en priorité. <Missing>médiateur de la consommation compétent</Missing>
        </p>
        <p>
          À défaut d’accord amiable, les tribunaux compétents seront ceux du ressort du siège
          social de l’éditeur. <Missing>à confirmer selon la forme juridique</Missing>
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
