import type { ReactNode } from 'react'
import { EtatVide } from '@/components/etats/EtatVide'
import { PanneauSaisie } from '@/features/saisie/PanneauSaisie'
import { SURTITRE_FIJ } from '@/features/saisie-fij/departements'
import { useEstMinistereFij } from '@/features/saisie-fij/useSaisiesFij'
import { ChargementSaisie } from '@/features/saisie-session/ChargementSaisie'
import { LienSignalement } from '@/features/signalement/LienSignalement'
import { PageNonDisponible } from '@/pages/PageNonDisponible'

interface Props {
  ministereId: string
  /** Titre de l'adresse, affiché pendant la vérification. */
  titre: string
  /** « Retour », Échap et le fond du panneau, comme dans la saisie elle-même. */
  onFermer: () => void
  /** Écran du lien « Signaler une difficulté » en cas de problème. */
  ecran: 'saisie_fij' | 'saisie_fij_statistiques'
  children: ReactNode
}

/**
 * Les deux saisies FIJ sont réservées au ministère de code `fij` (plan de l'étape 4, adresses) :
 * le profil « ministère » est déjà vérifié par `PageApplication` ; ici, le code du ministère du
 * compte (une seule lecture) décide. Un autre ministère reçoit la page non disponible, sans
 * aucune autre requête. La base refuse de toute façon (politique d'ajout, fonction). Pendant la
 * lecture, le chargement et l'erreur prennent la forme de la saisie (même panneau, même titre) :
 * rien ne saute quand le formulaire arrive.
 */
export function GardeMinistereFij({ ministereId, titre, onFermer, ecran, children }: Props) {
  const { etat, reessayer } = useEstMinistereFij(ministereId)
  if (etat === 'autre') return <PageNonDisponible />
  if (etat === 'fij') return children
  return (
    <PanneauSaisie titre={titre} surtitre={SURTITRE_FIJ} onFermer={onFermer}>
      {etat === 'chargement' ? (
        <ChargementSaisie />
      ) : (
        <EtatVide
          situation="probleme_passager"
          action={{ libelle: 'Réessayer', surClic: reessayer }}
        >
          La connexion a échoué. Réessayez.
        </EtatVide>
      )}
      <LienSignalement ecran={ecran} />
    </PanneauSaisie>
  )
}
