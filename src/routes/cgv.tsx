import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout, LegalSection, Missing } from "@/components/legal/LegalLayout";

export const Route = createFileRoute("/cgv")({
  head: () => ({
    meta: [
      { title: "Conditions générales de vente — Trade-In Pro" },
      {
        name: "description",
        content:
          "Conditions générales de Trade-In Pro : utilisation du service, responsabilités et droits.",
      },
      { property: "og:title", content: "Conditions générales de vente — Trade-In Pro" },
      {
        property: "og:description",
        content: "Conditions d’utilisation de Trade-In Pro, responsabilités et droits.",
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
          Les présentes conditions régissent l’utilisation du service Trade-In
          Pro, un logiciel en ligne (SaaS) destiné aux boutiques de réparation et de reprise de
          téléphones : estimations de reprise, gestion des réparations, des clients et de la
          facturation.
        </p>
        <p>
          Éditeur : <Missing>raison sociale, SIRET et adresse — reprise des mentions légales</Missing>
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
