import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout, LegalSection, Missing } from "@/components/legal/LegalLayout";

export const Route = createFileRoute("/confidentialite")({
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — Trade-In Pro" },
      {
        name: "description",
        content:
          "Politique de confidentialité de Trade-In Pro : données collectées, finalités, sous-traitants et droits RGPD.",
      },
      { property: "og:title", content: "Politique de confidentialité — Trade-In Pro" },
      {
        property: "og:description",
        content: "Comment Trade-In Pro collecte, utilise et protège vos données personnelles et celles de vos clients.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConfidentialitePage,
});

function ConfidentialitePage() {
  return (
    <LegalLayout title="Politique de confidentialité" updated="25 octobre 2026">
      <LegalSection title="1. Responsable de traitement">
        <p>
          Le responsable de traitement est l’éditeur du service :{" "}
          <Missing>raison sociale, adresse et e-mail de contact dédié aux données personnelles</Missing>
        </p>
        <p>
          Chaque boutique utilisatrice reste responsable de traitement des données de ses propres
          clients (fiches clients, réparations, factures) ; l’éditeur agit alors comme
          sous-traitant.
        </p>
      </LegalSection>

      <LegalSection title="2. Données collectées">
        <p>
          <strong>Comptes et boutiques :</strong> nom, adresse e-mail, mot de passe (chiffré), nom
          et coordonnées de la boutique, rôle dans la boutique.
        </p>
        <p>
          <strong>Données d’exploitation saisies par la boutique :</strong> fiches clients (nom,
          téléphone, e-mail, adresse), réparations, estimations, factures, règles de prix.
        </p>
        <p>
          <strong>Données de paiement :</strong> traitées intégralement par Stripe ; nous ne
          stockons aucun numéro de carte. Nous conservons uniquement le statut d’abonnement et les
          dates de période.
        </p>
        <p>
          <strong>Données techniques :</strong> journaux de connexion et d’erreurs nécessaires à la
          sécurité et au bon fonctionnement.
        </p>
      </LegalSection>

      <LegalSection title="3. Finalités et bases légales">
        <p>
          Fourniture du service et gestion du compte (exécution du contrat), facturation de
          l’abonnement (exécution du contrat), sécurité et prévention de la fraude (intérêt
          légitime), obligations comptables et fiscales (obligation légale).
        </p>
      </LegalSection>

      <LegalSection title="4. Sous-traitants et destinataires">
        <p>
          Hébergement de l’application et de la base de données : infrastructure cloud de Lovable.
          Paiement : Stripe. Aucune donnée n’est vendue ni partagée à des tiers à des fins
          commerciales.
        </p>
        <p>
          <Missing>liste définitive des sous-traitants et localisation des données à confirmer</Missing>
        </p>
      </LegalSection>

      <LegalSection title="5. Durées de conservation">
        <p>
          Compte et données de boutique : pendant toute la durée de l’abonnement, puis{" "}
          <Missing>délai après résiliation</Missing>. Données de facturation : 10 ans (obligations
          comptables). Journaux techniques : <Missing>durée de conservation des journaux</Missing>
        </p>
      </LegalSection>

      <LegalSection title="6. Vos droits">
        <p>
          Vous disposez des droits d’accès, de rectification, d’effacement, de limitation, de
          portabilité et d’opposition. Pour les exercer :{" "}
          <Missing>adresse e-mail dédiée aux demandes RGPD</Missing>
        </p>
        <p>
          Vous pouvez également introduire une réclamation auprès de la CNIL (cnil.fr).
        </p>
      </LegalSection>

      <LegalSection title="7. Cookies">
        <p>
          Le service utilise uniquement des cookies et stockages techniques strictement nécessaires
          (session de connexion). Aucun cookie publicitaire ou de mesure d’audience tiers n’est
          déposé. <Missing>à revérifier si un outil d’analyse est ajouté</Missing>
        </p>
      </LegalSection>

      <LegalSection title="8. Sécurité">
        <p>
          Les données de chaque boutique sont isolées et inaccessibles aux autres boutiques. Les
          échanges sont chiffrés (HTTPS) et les mots de passe sont stockés sous forme dérivée
          (hachage). Les accès aux données sont journalisés.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
