import { useId, useState } from 'react'
import { Bouton } from '@/components/ui/Bouton'
import { FenetreConfirmation } from '@/components/ui/FenetreConfirmation'
import { lireEchecCorrection } from '@/data/evenementsCorrections'
import { ChoixPortee } from '@/features/evenements/ChoixPortee'
import type { ChoixSerie, Portee } from '@/features/evenements/ChoixPortee'
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
  /** Une date d'une série (T78, lot 2) : le choix « Toute la série » dans la fenêtre. */
  serie?: ChoixSerie<void>
  /**
   * Les dates que « Toute la série » laisse au calendrier (`datesQuiRestent`, décision du
   * 27 octobre 2026), dites dans la fenêtre quand « Toute la série » est choisie ; null : aucune.
   */
  restentSerie?: string | null
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
export function RetraitEvenement({ raison, texte, retirer, serie, restentSerie = null }: Props) {
  const id = useId()
  const [ouverte, setOuverte] = useState(false)
  const [portee, setPortee] = useState<Portee>('evenement')
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
          onConfirmer={() =>
            serie !== undefined && portee === 'serie' ? serie.envoyer() : retirer()
          }
          onAnnuler={() => setOuverte(false)}
          lireMessage={(refus) => lireEchecCorrection(refus).message}
        >
          {serie ? (
            <ChoixPortee
              id={`${id}-portee`}
              nombre={serie.nombre}
              libelleSerie={serie.libelle}
              valeur={portee}
              onChange={setPortee}
            />
          ) : null}
          {serie && restentSerie !== null ? (
            // Toujours dans la fenêtre, pour que la phrase qui paraît avec « Toute la série » soit lue.
            <p aria-live="polite" className="text-detail leading-normal text-encre-2">
              {portee === 'serie' ? restentSerie : ''}
            </p>
          ) : null}
        </FenetreConfirmation>
      ) : null}
    </div>
  )
}
