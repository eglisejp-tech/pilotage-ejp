import type { ReactNode } from 'react'
import { useTitrePage } from '@/features/connexion/useTitrePage'
import { TEXTES_MODERATION } from '@/features/moderation/textes'

interface Props {
  /** « Modération », titre de l'écran et de l'onglet. */
  titre: string
  /** « N indicateurs attendent votre validation », s'il y a lieu (en tête). */
  bandeau?: ReactNode
  /** Le bloc « Signalements » (T39), au-dessus du reste de l'écran. */
  signalements?: ReactNode
  /** La file « Champs libres à relire » (maquette 15). */
  file?: ReactNode
}

/**
 * Écran `/moderation` d'EJP Tech, l'accueil de ce profil (BRIEF, « Modération » ; maquette 15) :
 * « Administration de la plateforme » et le titre de l'écran (h1), puis en tête l'état des
 * indicateurs à valider, le bloc « Signalements » et la file des champs libres à relire. Le titre
 * de page (h1) précède les titres des deux blocs (h2).
 *
 * Écart tracé (LISEZMOI, écran 15) : la maquette titre l'écran « Champs libres à relire » ; ici ce
 * titre est celui de la file, car l'écran porte aussi les signalements et les indicateurs à valider.
 */
export function EcranModeration({ titre, bandeau, signalements, file }: Props) {
  useTitrePage(titre)
  return (
    <section aria-labelledby="titre-page" className="flex flex-col">
      <p className="text-sm text-encre-2">{TEXTES_MODERATION.surtitre}</p>
      <h1 id="titre-page" className="font-lecture text-titre leading-tight font-medium">
        {titre}
      </h1>
      {bandeau ? <div className="mt-6">{bandeau}</div> : null}
      {/* Maquette 15 : pas de filet sous le titre de l'écran, celui du bloc suit. */}
      {signalements ? <div className="mt-8">{signalements}</div> : null}
      {file ? <div className="mt-12">{file}</div> : null}
    </section>
  )
}
