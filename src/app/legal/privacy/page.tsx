export default function PrivacyPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">Politique de Confidentialité</h1>
      <p className="text-sm opacity-60 mb-8">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

      <h2>1. Introduction</h2>
      <p>
        L'application <strong>Nous2</strong> est un espace privé et sécurisé dédié aux couples. 
        Nous accordons une importance capitale à la confidentialité de vos souvenirs et de vos échanges.
      </p>

      <h2>2. Données collectées</h2>
      <p>Pour le bon fonctionnement de l'application, nous collectons uniquement les données suivantes :</p>
      <ul>
        <li><strong>Email :</strong> Utilisé exclusivement pour l'authentification et la récupération de compte.</li>
        <li><strong>Photos :</strong> Vos souvenirs partagés dans les albums.</li>
        <li><strong>Notes & Textes :</strong> Les messages et notes que vous écrivez.</li>
        <li><strong>Événements :</strong> Les dates importantes de votre calendrier commun.</li>
      </ul>
      <p>
        <strong>Note importante sur la géolocalisation :</strong> Par souci de confidentialité, nous avons supprimé toute fonctionnalité de géolocalisation précise. 
        Les métadonnées GPS de vos photos sont automatiquement nettoyées lors de l'upload.
      </p>

      <h2>3. Stockage et Sécurité</h2>
      <p>
        Vos données sont stockées de manière sécurisée sur des serveurs situés en Europe (via Supabase / PostgreSQL). 
        L'accès à vos données est strictement limité à vous et votre partenaire.
      </p>

      <h2>4. Vos Droits (RGPD)</h2>
      <p>Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :</p>
      <ul>
        <li><strong>Droit d'accès :</strong> Vous pouvez consulter l'ensemble de vos données à tout moment via l'application.</li>
        <li><strong>Droit de rectification :</strong> Vous pouvez modifier vos informations depuis votre profil.</li>
        <li><strong>Droit à l'oubli :</strong> Vous pouvez supprimer votre compte à tout moment depuis la section "Sécurité" de votre profil. 
        <br/>
        <em>Attention : La suppression de votre compte entraîne la suppression définitive et irréversible de toutes vos données (photos, notes, événements) ainsi que celles de votre couple.</em></li>
      </ul>

      <h2>5. Cookies</h2>
      <p>
        Nous utilisons uniquement des cookies techniques essentiels au fonctionnement de l'application (maintien de votre session connectée). 
        Aucun cookie publicitaire ou de traçage tiers n'est utilisé.
      </p>

      <h2>6. Contact</h2>
      <p>Pour toute question relative à vos données, vous pouvez nous contacter via le support de l'application.</p>
    </div>
  )
}
