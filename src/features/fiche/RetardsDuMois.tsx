import { useState } from 'react'
import { EtatVide } from '@/components/etats/EtatVide'
import { ChargementBloc } from '@/features/fiche/ChargementBloc'
import type { EtatRetards, RetardsAListe } from '@/features/fiche/construireComptages'
import { TEXTES_COMPTAGES } from '@/features/fiche/textesComptages'

interface Props {
  retards: RetardsAListe
  lecture: EtatRetards
}

/**
 * Liste repliée des événements commencés en retard dans le mois des grandes valeurs (T68) : jour,
 * titre, ministère porteur et minutes de retard, lus dans `v_evenement`. Pour le berger, le
 * conseil et EJP Tech seulement ; Coordination ne lit que les totaux (K11). Le résumé dit le
 * nombre, lu dans les comptages : la liste ne s'affiche jamais vide.
 */
export function RetardsDuMois({ retards, lecture }: Props) {
  const [ouvert, setOuvert] = useState(false)
  return (
    <details
      open={ouvert}
      onToggle={(evenement) => setOuvert(evenement.currentTarget.open)}
      className="text-detail"
    >
      <summary className="inline-flex min-h-cible cursor-pointer items-center font-semibold text-encre underline underline-offset-4">
        {TEXTES_COMPTAGES.retards.resume(retards.nombre, retards.mois)}
      </summary>
      {lecture.etat === 'chargement' ? (
        <ChargementBloc texte={TEXTES_COMPTAGES.retards.chargement} />
      ) : null}
      {lecture.etat === 'erreur' ? (
        <EtatVide
          situation="probleme_passager"
          action={{ libelle: 'Réessayer', surClic: lecture.reessayer }}
        >
          {TEXTES_COMPTAGES.probleme}
        </EtatVide>
      ) : null}
      {lecture.etat === 'donnees' ? (
        <ul className="flex flex-col pb-2">
          {lecture.donnees.map((ligne) => (
            <li key={ligne.id} className="flex min-h-7 flex-wrap items-center gap-x-1 text-encre-2">
              <span>
                {ligne.jour}, {ligne.titre}
                {ligne.ministere !== null ? ` (${ligne.ministere})` : null} :
              </span>
              <span className="font-semibold text-encre">{ligne.retard}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </details>
  )
}
