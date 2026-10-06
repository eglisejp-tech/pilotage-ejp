import { PanneauSaisie } from '@/features/saisie/PanneauSaisie'
import { ContenuSaisieDimanche } from '@/features/saisie-chiffres/ContenuSaisieDimanche'
import { surtitreDimanche, titreDimanche } from '@/features/saisie-chiffres/textes'
import { useSaisieDimanche } from '@/features/saisie-chiffres/useSaisieDimanche'

interface Props {
  ministereId: string
  /** `?date=` de l'adresse, ou null. */
  parametreDate: string | null
  /** Titre de l'adresse, tant que le dimanche n'est pas connu. */
  titre: string
  onFermer: () => void
}

/**
 * Saisie du dimanche (maquette 08) avec ses lectures. Le titre est le dimanche saisi
 * (« Dimanche 27 septembre ») ; le panneau garde sa place dans chaque état.
 */
export function SaisieDimancheConnectee({ ministereId, parametreDate, titre, onFermer }: Props) {
  const etat = useSaisieDimanche(ministereId, parametreDate)
  return (
    <PanneauSaisie
      titre={etat.etat === 'pret' ? titreDimanche(etat.dimanche) : titre}
      surtitre={surtitreDimanche(etat.etat === 'pret' && etat.champs.correction)}
      onFermer={onFermer}
    >
      <ContenuSaisieDimanche etat={etat} />
    </PanneauSaisie>
  )
}
