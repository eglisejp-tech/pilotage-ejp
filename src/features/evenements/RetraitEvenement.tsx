import { useState } from 'react'
import { Bouton } from '@/components/ui/Bouton'
import { FenetreConfirmation } from '@/components/ui/FenetreConfirmation'
import { lireEchecCorrection } from '@/data/evenementsCorrections'
import { TEXTES_CORRECTIONS } from '@/features/evenements/textesCorrections'
import { LienSignalement } from '@/features/signalement/LienSignalement'

interface Props {
  /**
   * Vrai pour le porteur jusqu'à la date de l'événement comprise, et pour EJP Tech ; faux pour le
   * porteur après la date : la raison et « Signaler une difficulté » remplacent le bouton.
   */
  possible: boolean
  /** La phrase de la fenêtre : celle du porteur, ou celle d'EJP Tech. */
  texte: string
  /** Écrit le retrait (`retirer_evenement`) ; le panneau dit ensuite que l'événement est retiré. */
  retirer: () => Promise<void>
}

/**
 * « Retirer l'événement » (T78, conception calendrier-evenements.md, 6.3 et 8.2) : un bouton
 * discret en bas du panneau, qui ouvre « Retirer cet événement ? » (ce que fait le retrait, qu'il
 * est définitif, et Annulé pour un événement qui n'aura pas lieu), avec « Retirer l'événement » et
 * « Garder l'événement ». Un refus de la base se dit dans la fenêtre. Après la date, pour le
 * porteur, l'action reste visible avec sa raison : « Un événement passé se retire par EJP Tech.
 * S'il a été créé par erreur, signalez-le. », suivie du lien « Signaler une difficulté ».
 */
export function RetraitEvenement({ possible, texte, retirer }: Props) {
  const [ouverte, setOuverte] = useState(false)
  if (!possible) {
    return (
      <p className="text-detail leading-normal text-encre-2">
        {TEXTES_CORRECTIONS.retraitPasse} <LienSignalement ecran="saisie_evenement" enLigne />
      </p>
    )
  }
  return (
    <div className="flex">
      <Bouton variante="lien" taille="lien" onClick={() => setOuverte(true)}>
        {TEXTES_CORRECTIONS.retirer}
      </Bouton>
      {ouverte ? (
        <FenetreConfirmation
          titre={TEXTES_CORRECTIONS.titreRetrait}
          texte={texte}
          confirmer={TEXTES_CORRECTIONS.retirer}
          libelleEnCours={TEXTES_CORRECTIONS.retraitEnCours}
          annuler={TEXTES_CORRECTIONS.garder}
          varianteConfirmer="sombre"
          onConfirmer={retirer}
          onAnnuler={() => setOuverte(false)}
          lireMessage={(refus) => lireEchecCorrection(refus).message}
        />
      ) : null}
    </div>
  )
}
