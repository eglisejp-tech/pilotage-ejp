import type { ReactNode } from 'react'
import { useTitrePage } from '@/features/connexion/useTitrePage'

/** Le reste de l'écran Modération (file de relecture, maquette 15) arrive à l'étape 6. */
export const RELECTURE_A_VENIR = "La relecture des champs libres arrive à l'étape 6."

interface Props {
  /** « Modération », titre de l'écran et de l'onglet. */
  titre: string
  /** Le bloc « Signalements », en tête de l'écran (T39). */
  children: ReactNode
}

/**
 * Écran `/moderation` d'EJP Tech à l'étape 4 : le titre de l'écran, le bloc « Signalements » au-
 * dessus du reste (BRIEF, « Modération »), puis la phrase qui dit que la relecture arrive à
 * l'étape 6. Le titre de page (h1) précède le titre du bloc (h2).
 */
export function EcranModeration({ titre, children }: Props) {
  useTitrePage(titre)
  return (
    <section aria-labelledby="titre-page" className="flex flex-col">
      <h1 id="titre-page" className="font-lecture text-titre leading-tight font-medium">
        {titre}
      </h1>
      {/* Maquette 15 : pas de filet sous le titre de l'écran, celui du bloc suit. */}
      <div className="mt-8">{children}</div>
      <p className="mt-10 max-w-prose text-encre-2">{RELECTURE_A_VENIR}</p>
    </section>
  )
}
