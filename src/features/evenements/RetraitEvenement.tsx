import { useState } from 'react'
import { Bouton } from '@/components/ui/Bouton'
import { FenetreConfirmation } from '@/components/ui/FenetreConfirmation'
import { lireEchecCorrection } from '@/data/evenementsCorrections'
import { TEXTES_CORRECTIONS } from '@/features/evenements/textesCorrections'
import { LienSignalement } from '@/features/signalement/LienSignalement'

interface Props {
  /**
   * Pourquoi le porteur ne retire plus l'événement (`raisonRetraitImpossible` : « Terminé » ou
   * « Annulé » enregistré, puis la date passée) : la raison et « Signaler une difficulté »
   * remplacent le bouton. Null quand le retrait est possible (porteur avant tout état final et
   * jusqu'à la date comprise ; EJP Tech toujours).
   */
  raison: string | null
  /** La phrase de la fenêtre : celle du porteur, ou celle d'EJP Tech. */
  texte: string
  /** Écrit le retrait (`retirer_evenement`) ; le panneau dit ensuite que l'événement est retiré. */
  retirer: () => Promise<void>
}

/**
 * « Retirer l'événement » (T78, conception calendrier-evenements.md, 6.3 et 8.2) : un bouton
 * discret en bas du panneau, qui ouvre « Retirer cet événement ? » (ce que fait le retrait, qu'il
 * est définitif, et Annulé pour un événement qui n'aura pas lieu), avec « Retirer l'événement » et
 * « Garder l'événement ». Un refus de la base se dit dans la fenêtre. Quand le porteur ne peut plus
 * retirer, l'action reste visible avec sa raison (« Cet événement est terminé : pour le retirer,
 * signalez-le à EJP Tech. »), suivie du lien « Signaler une difficulté » : le seul du panneau,
 * celui du formulaire ne s'affiche pas alors (décision du 27 octobre 2026).
 */
export function RetraitEvenement({ raison, texte, retirer }: Props) {
  const [ouverte, setOuverte] = useState(false)
  if (raison !== null) {
    return (
      <p className="text-detail leading-normal text-encre-2">
        {raison} <LienSignalement ecran="saisie_evenement" enLigne />
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
