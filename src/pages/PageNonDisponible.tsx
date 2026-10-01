import { useTitrePage } from '@/features/connexion/useTitrePage'
import { LienAccueil } from '@/pages/LienAccueil'

/**
 * Adresse réservée à un autre profil (BRIEF section 9) : message neutre, aucune requête. Le
 * routage ne remplace pas la RLS, qui refuse de toute façon les données.
 */
export function PageNonDisponible() {
  useTitrePage('Page non disponible')
  return (
    <section aria-labelledby="titre-page">
      <h1 id="titre-page" className="font-lecture text-titre leading-tight font-medium">
        Cette page n'est pas disponible avec votre compte.
      </h1>
      <div className="mt-2 border-t-2 border-encre" />
      <p className="mt-6 max-w-prose text-encre-2">Elle est réservée à un autre profil.</p>
      <LienAccueil />
    </section>
  )
}
