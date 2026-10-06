import type { ReactNode } from 'react'
import { EtatVide } from '@/components/etats/EtatVide'
import { ChargementSaisie } from '@/features/saisie-session/ChargementSaisie'
import { useEstMinistereFij } from '@/features/saisie-fij/useSaisiesFij'
import { PageNonDisponible } from '@/pages/PageNonDisponible'

interface Props {
  ministereId: string
  /** Titre de l'adresse, affiché pendant la vérification. */
  titre: string
  children: ReactNode
}

/**
 * Les deux saisies FIJ sont réservées au ministère de code `fij` (plan de l'étape 4, adresses) :
 * le profil « ministère » est déjà vérifié par `PageApplication` ; ici, le code du ministère du
 * compte (une seule lecture) décide. Un autre ministère reçoit la page non disponible, sans
 * aucune autre requête. La base refuse de toute façon (politique d'ajout, fonction).
 */
export function GardeMinistereFij({ ministereId, titre, children }: Props) {
  const { etat, reessayer } = useEstMinistereFij(ministereId)
  if (etat === 'autre') return <PageNonDisponible />
  if (etat === 'fij') return children
  return (
    <section aria-labelledby="titre-page" className="flex flex-col gap-5">
      <h1 id="titre-page" className="font-lecture text-[32px] leading-[1.1] font-medium">
        {titre}
      </h1>
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
    </section>
  )
}
