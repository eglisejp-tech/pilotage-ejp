import { PanneauSaisie } from '@/features/saisie/PanneauSaisie'
import { ContenuSaisieMois } from '@/features/saisie-chiffres/ContenuSaisieMois'
import { TEXTES_CHIFFRES, titreMois } from '@/features/saisie-chiffres/textes'
import { useSaisieMois } from '@/features/saisie-chiffres/useSaisieMois'

interface Props {
  ministereId: string
  /** `?mois=AAAA-MM` de l'adresse, ou null. */
  parametreMois: string | null
  /** Titre de l'adresse, tant que le mois n'est pas connu. */
  titre: string
  onFermer: () => void
}

/**
 * « Chiffres du mois » avec ses lectures. Le titre est le mois saisi (« Septembre 2026 ») ; le
 * panneau garde sa place dans chaque état.
 */
export function SaisieMoisConnectee({ ministereId, parametreMois, titre, onFermer }: Props) {
  const etat = useSaisieMois(ministereId, parametreMois)
  return (
    <PanneauSaisie
      titre={etat.etat === 'pret' ? titreMois(etat.mois, etat.enCours) : titre}
      surtitre={TEXTES_CHIFFRES.surtitreMois}
      onFermer={onFermer}
    >
      <ContenuSaisieMois etat={etat} />
    </PanneauSaisie>
  )
}
