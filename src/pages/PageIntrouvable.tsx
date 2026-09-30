import { Link } from 'react-router'

export function PageIntrouvable() {
  return (
    <section aria-labelledby="titre-page">
      <h1 id="titre-page" className="font-lecture text-titre leading-tight font-medium">
        Page introuvable
      </h1>
      <div className="mt-2 border-t-2 border-encre" />
      <p className="mt-6 max-w-prose text-encre-2">Cette adresse ne correspond à aucun écran.</p>
      <p className="mt-4">
        <Link to="/" className="text-nuit underline underline-offset-4">
          Revenir à l'accueil
        </Link>
      </p>
    </section>
  )
}
