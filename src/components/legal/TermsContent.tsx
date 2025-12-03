export default function TermsContent() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">Conditions Générales d'Utilisation</h1>
      <p className="text-sm opacity-60 mb-8">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

      <h2>1. Objet</h2>
      <p>
        Les présentes CGU régissent l'utilisation de l'application <strong>Nous2</strong>, un service privé dédié à la gestion de la vie de couple (partage de photos, notes, calendrier).
      </p>

      <h2>2. Accès au service</h2>
      <p>
        L'application est réservée aux personnes majeures. L'accès nécessite la création d'un compte via une adresse email valide.
      </p>

      <h2>3. Règles de conduite</h2>
      <p>En utilisant Nous2, vous vous engagez à :</p>
      <ul>
        <li>Ne pas publier de contenu illégal, haineux ou violent.</li>
        <li>Respecter la vie privée et le consentement de votre partenaire.</li>
        <li>Ne pas utiliser l'application à des fins frauduleuses.</li>
      </ul>
      <p>
        L'application étant un espace privé, vous êtes seul responsable du contenu que vous y déposez.
      </p>

      <h2>4. Responsabilité</h2>
      <p>
        Nous mettons tout en œuvre pour assurer la disponibilité et la sécurité du service. Toutefois, nous ne saurions être tenus responsables en cas de perte de données accidentelle ou d'interruption temporaire du service.
      </p>

      <h2>5. Résiliation</h2>
      <p>
        Vous pouvez cesser d'utiliser le service à tout moment en supprimant votre compte. Nous nous réservons le droit de suspendre un compte en cas de violation grave des présentes conditions.
      </p>
    </div>
  )
}
