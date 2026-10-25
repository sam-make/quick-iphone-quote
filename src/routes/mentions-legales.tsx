import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout, LegalSection, Missing } from "@/components/legal/LegalLayout";

export const Route = createFileRoute("/mentions-legales")({
  head: () => ({
    meta: [
      { title: "Mentions légales — Trade-In Pro" },
      {
        name: "description",
        content: "Mentions légales du service Trade-In Pro : éditeur, hébergement et propriété intellectuelle.",
      },
      { property: "og:title", content: "Mentions légales — Trade-In Pro" },
      {
        property: "og:description",
        content: "Informations légales relatives à l’éditeur et à l’hébergement du service Trade-In Pro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MentionsLegalesPage,
});

function MentionsLegalesPage() {
  return (
    <LegalLayout title="Mentions légales" updated="25 octobre 2026">
      <LegalSection title="Éditeur du service">
        <p>
          Le service Trade-In Pro (également présenté sous le nom ReprisePro) est édité par :
        </p>
        <p>
          <Missing>raison sociale et forme juridique (ex. SAS, EURL, entrepreneur individuel)</Missing>
        </p>
        <p>
          <Missing>capital social</Missing> — <Missing>numéro SIRET</Missing> —{" "}
          <Missing>RCS (ville et numéro)</Missing>
        </p>
        <p>
          Siège social : <Missing>adresse complète du siège social</Missing>
        </p>
        <p>
          Contact : <Missing>adresse e-mail de contact</Missing> —{" "}
          <Missing>numéro de téléphone</Missing>
        </p>
        <p>
          Directeur de la publication : <Missing>nom du directeur de la publication</Missing>
        </p>
      </LegalSection>

      <LegalSection title="Hébergement">
        <p>
          L’application est hébergée sur l’infrastructure cloud de Lovable, et les données sont
          stockées sur l’infrastructure de base de données associée.
        </p>
        <p>
          <Missing>coordonnées complètes de l’hébergeur à confirmer avant publication</Missing>
        </p>
      </LegalSection>

      <LegalSection title="Propriété intellectuelle">
        <p>
          L’ensemble des éléments du service (marque, logo, interface, textes, code) est protégé par
          le droit de la propriété intellectuelle. Toute reproduction ou utilisation sans
          autorisation écrite est interdite.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Pour toute question relative au service : <Missing>adresse e-mail de support</Missing>
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
