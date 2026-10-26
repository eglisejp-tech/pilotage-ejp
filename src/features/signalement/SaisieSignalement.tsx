import { signalerDifficulte } from '@/data/signalements'
import { creerPuisRelire, useApresEcriture } from '@/features/evenements/useApresEcriture'
import { useFermerSaisie } from '@/features/evenements/useFermerSaisie'
import { PanneauSignalement } from '@/features/signalement/PanneauSignalement'
import type { Signalement } from '@/features/signalement/schemas'
import type { EcranSignalement } from '@/lib/base'

interface Props {
  libelleCompte: string
  /** Écran d'origine, lu dans l'adresse (« autre » pour un code inconnu). */
  ecran: EcranSignalement
}

/**
 * `/signaler` pour un ministère : le formulaire s'affiche tout de suite et ne lit rien ; le suivi
 * est sur « Mes signalements » (T77), par le lien sous le formulaire. Un envoi réussi relit les
 * lectures déjà faites, comme toute saisie (« Mes signalements », « Ma semaine »).
 */
export function SaisieSignalement({ libelleCompte, ecran }: Props) {
  const fermer = useFermerSaisie()
  const apresEcriture = useApresEcriture()

  const envoyer = (signalement: Signalement) =>
    creerPuisRelire(() => signalerDifficulte(signalement), apresEcriture)

  return (
    <PanneauSignalement
      ecran={ecran}
      envoyer={envoyer}
      onFermer={fermer}
      surtitre={libelleCompte}
    />
  )
}
