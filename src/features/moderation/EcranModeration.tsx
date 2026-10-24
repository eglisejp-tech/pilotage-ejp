import type { ReactNode } from 'react'
import { EnTetePage } from '@/components/ui/EnTetePage'
import { GabaritPage } from '@/components/ui/GabaritPage'
import { useTitrePage } from '@/features/connexion/useTitrePage'

interface Props {
  /** « Modération », titre de l'écran et de l'onglet. */
  titre: string
  /** « N indicateurs attendent votre validation », s'il y a lieu (en tête). */
  bandeau?: ReactNode
  /** Le bloc « Signalements » (T39), au-dessus du reste de l'écran. */
  signalements?: ReactNode
  /** La file « Textes à relire » (maquette 15, « Champs libres à relire »). */
  file?: ReactNode
}

/**
 * Écran `/moderation` d'EJP Tech, l'accueil de ce profil (BRIEF, « Modération » ; maquette 15) :
 * le titre de l'écran (h1), sans surtitre (T66, t345), puis en tête l'état des indicateurs à
 * valider, le bloc « Signalements » et la file des textes à relire. Le titre de page (h1) précède
 * les titres des deux blocs (h2). Gabarit commun (proposition 14, T69) : l'en-tête et son bandeau
 * (24 px entre eux), puis un seul écart de 48 px avant chaque bloc.
 *
 * Écart tracé (LISEZMOI, écran 15) : la maquette titre l'écran « Champs libres à relire » ; ici ce
 * titre est celui de la file (« Textes à relire », T66), car l'écran porte aussi les signalements
 * et les indicateurs à valider.
 */
export function EcranModeration({ titre, bandeau, signalements, file }: Props) {
  useTitrePage(titre)
  return (
    <section aria-labelledby="titre-page">
      <GabaritPage>
        <div className="flex flex-col gap-bloc">
          <EnTetePage titre={titre} idTitre="titre-page" />
          {bandeau}
        </div>
        {/* Maquette 15 : pas de filet sous le titre de l'écran, celui du bloc suit. */}
        {signalements}
        {file}
      </GabaritPage>
    </section>
  )
}
