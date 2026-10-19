import { useTitrePage } from '@/features/connexion/useTitrePage'

type Proprietes = {
  titre: string
  /** Étape du plan qui construit l'écran (BRIEF section 13). */
  etape: number
}

/**
 * Onglet pas encore construit : titre de l'écran et une phrase, aucune donnée chargée. La phrase
 * ne parle pas du plan du projet (T66, t046) ; l'étape reste dans l'attribut `data-etape`.
 */
export function PageAVenir({ titre, etape }: Proprietes) {
  useTitrePage(titre)
  return (
    <section aria-labelledby="titre-page" data-etape={etape}>
      <h1 id="titre-page" className="font-lecture text-titre leading-tight font-medium">
        {titre}
      </h1>
      <div className="mt-2 border-t-2 border-encre" />
      <p className="mt-6 max-w-prose text-encre-2">Cette page n'est pas encore disponible.</p>
    </section>
  )
}
