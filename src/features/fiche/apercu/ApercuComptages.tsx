import { useMemo } from 'react'
import {
  COMPTAGES_EXEMPLE,
  COMPTAGES_PREMIER_MOIS_EXEMPLE,
  NOMS_MINISTERES_EXEMPLE,
  RETARDS_EXEMPLE,
} from '@/features/fiche/apercu/exemplesComptages'
import { BlocEvenementsEglise } from '@/features/fiche/BlocEvenementsEglise'
import { BlocPonctualite } from '@/features/fiche/BlocPonctualite'
import {
  construireComptages,
  construireRetards,
  retardsVisibles,
} from '@/features/fiche/construireComptages'
import type { EtatComptages, EtatRetards } from '@/features/fiche/construireComptages'
import type { ProfilFiche } from '@/features/fiche/modeleFiche'

/** Écrans des comptages dans l'aperçu de la fiche (`?ecran=`). */
export type EcranComptages =
  | 'comptages'
  | 'comptages-premier-mois'
  | 'comptages-vide'
  | 'comptages-erreur'
  | 'comptages-chargement'

interface Props {
  ecran: EcranComptages
  profil: ProfilFiche
}

const reessayer = () => undefined

function etatDe(ecran: EcranComptages): EtatComptages {
  switch (ecran) {
    case 'comptages-chargement':
      return { etat: 'chargement' }
    case 'comptages-erreur':
      return { etat: 'erreur', reessayer }
    case 'comptages-vide':
      return { etat: 'premier_usage' }
    case 'comptages':
    case 'comptages-premier-mois': {
      const lignes = ecran === 'comptages' ? COMPTAGES_EXEMPLE : COMPTAGES_PREMIER_MOIS_EXEMPLE
      const donnees = construireComptages(lignes)
      return donnees === null ? { etat: 'premier_usage' } : { etat: 'donnees', donnees }
    }
  }
}

/**
 * Les blocs « Événements de l'église » et « Ponctualité » de la fiche de Coordination, nourris
 * des lignes d'exemple, dans la colonne gauche de la grille de la fiche. `?profil=ministere` est
 * Coordination : totaux seulement, sans la liste des retards (K11) ; le berger, le conseil et
 * EJP Tech ont la liste repliée.
 */
export function ApercuComptages({ ecran, profil }: Props) {
  const bloc = useMemo(() => etatDe(ecran), [ecran])
  const retards: EtatRetards | null = retardsVisibles(profil)
    ? { etat: 'donnees', donnees: construireRetards(RETARDS_EXEMPLE, NOMS_MINISTERES_EXEMPLE) }
    : null
  return (
    <>
      <title>Aperçu, Coordination, Pilotage EJP</title>
      <div className="flex flex-col gap-12">
        <h1 className="font-lecture text-[clamp(40px,4.2vw,56px)] leading-none font-medium break-words">
          Coordination
        </h1>
        <div className="grid items-start gap-12 xl:grid-cols-[minmax(0,1fr)_23.75rem] xl:gap-x-16">
          <div className="flex min-w-0 flex-col gap-12">
            <BlocEvenementsEglise bloc={bloc} />
            <BlocPonctualite bloc={bloc} retards={retards} />
          </div>
        </div>
      </div>
    </>
  )
}
