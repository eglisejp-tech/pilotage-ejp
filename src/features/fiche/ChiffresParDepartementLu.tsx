import { useQuery } from '@tanstack/react-query'
import { lireStatistiquesFij } from '@/data/fij'
import { BlocChiffresParDepartement } from '@/features/fiche/BlocChiffresParDepartement'
import type { EtatBlocFij } from '@/features/fiche/BlocChiffresParDepartement'
import { construireChiffresParDepartement } from '@/features/fiche/donneesChiffresParDepartement'
import { CLE_STATISTIQUES_FIJ } from '@/features/saisie-fij/useSaisiesFij'

interface Props {
  peutSaisir: boolean
}

/**
 * Lecture du bloc « Chiffres par département » (`v_fij_statistique`). Une vue sans ligne (profil
 * sans droit de lecture) ne montre rien : la RLS décide, l'emplacement ne fait que cacher.
 */
export function ChiffresParDepartementLu({ peutSaisir }: Props) {
  const lecture = useQuery({ queryKey: CLE_STATISTIQUES_FIJ, queryFn: lireStatistiquesFij })
  let bloc: EtatBlocFij
  if (lecture.isError) {
    bloc = { etat: 'erreur', reessayer: () => void lecture.refetch() }
  } else if (lecture.isPending) {
    bloc = { etat: 'chargement' }
  } else {
    const construit = construireChiffresParDepartement(lecture.data)
    if (construit === null) return null
    bloc =
      construit.situation === 'premier_usage'
        ? { etat: 'premier_usage' }
        : { etat: 'donnees', donnees: construit.donnees }
  }
  return <BlocChiffresParDepartement bloc={bloc} peutSaisir={peutSaisir} />
}
