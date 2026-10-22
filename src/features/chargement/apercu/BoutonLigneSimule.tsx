import { useEffect, useState } from 'react'
import { LibelleEnvoi } from '@/components/etats/LibelleEnvoi'

interface Props {
  /** Le libellé au repos (« Valider », « Renvoyer l'invitation »). */
  libelle: string
  /** Pendant l'envoi (« Validation en cours », « Envoi en cours »). */
  libelleEnCours: string
  /** Force l'envoi en cours, pour les captures. */
  enCours: boolean
}

const classeBoutonLigne =
  'inline-flex min-h-cible items-center justify-center bg-lumiere px-4.5 text-[15px] font-bold text-encre aria-disabled:cursor-wait'

/** Durée de l'envoi simulé, comme dans la proposition validée. */
const DUREE_ENVOI_SIMULE_MS = 1500

/**
 * Bouton de ligne de l'aperçu du moment 4 (T65), sans base : un clic simule un envoi de 1,5 s,
 * pendant lequel le bouton dit « … en cours » avec la petite flamme.
 */
export function BoutonLigneSimule({ libelle, libelleEnCours, enCours }: Props) {
  const [simule, setSimule] = useState(false)
  useEffect(() => {
    if (!simule) return
    const minuterie = window.setTimeout(() => setSimule(false), DUREE_ENVOI_SIMULE_MS)
    return () => window.clearTimeout(minuterie)
  }, [simule])
  const occupe = enCours || simule
  return (
    <button
      type="button"
      aria-disabled={occupe || undefined}
      onClick={() => {
        if (!occupe) setSimule(true)
      }}
      className={classeBoutonLigne}
    >
      <LibelleEnvoi enCours={occupe} libelleEnCours={libelleEnCours}>
        {libelle}
      </LibelleEnvoi>
    </button>
  )
}
