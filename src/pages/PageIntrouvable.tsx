import { useTitrePage } from '@/features/connexion/useTitrePage'
import { LienAccueil } from '@/pages/LienAccueil'

/** Adresse inconnue (BRIEF section 9). */
export function PageIntrouvable() {
  useTitrePage('Page introuvable')
  return (
    <section aria-labelledby="titre-page">
      <h1 id="titre-page" className="font-lecture text-titre leading-tight font-medium">
        Page introuvable
      </h1>
      <div className="mt-2 border-t-2 border-encre" />
      <p className="mt-6 max-w-prose text-encre-2">L'adresse est incomplète ou n'existe plus.</p>
      <LienAccueil />
    </section>
  )
}
