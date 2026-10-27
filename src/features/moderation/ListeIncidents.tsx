import { Bouton } from '@/components/ui/Bouton'
import { afficherIncident } from '@/features/moderation/construireIncidents'
import { TEXTES_INCIDENTS } from '@/features/moderation/textesIncidents'
import type { LigneIncident } from '@/lib/base'

/** Ce que la liste affiche : chargement, lecture impossible, ou les incidents lus. */
export type ContenuIncidents =
  | { etat: 'chargement' }
  | { etat: 'probleme'; reessayer: () => void }
  | {
      etat: 'liste'
      lignes: readonly LigneIncident[]
      /** Nombre d'incidents gardés (90 jours). */
      total: number
      /** « Afficher 50 de plus », s'il en reste ; null sinon. */
      plus: (() => void) | null
      plusEnCours: boolean
    }

/**
 * « Incidents d'envoi des 90 derniers jours (3) » (T76, lot C ; Proposé, Q6) : une liste repliée
 * sous le bloc « Signalements » de la Modération (écran 15, écart : un bloc non dessiné), sur le
 * modèle de « Retirés par les ministères ces 30 derniers jours ». Les signalements des personnes
 * et les incidents des appareils se lisent ensemble. Deux phrases par incident, la seconde en
 * `--encre-3` ; 50 incidents, puis « Afficher 50 de plus ».
 */
export function ListeIncidents({ contenu }: { contenu: ContenuIncidents }) {
  const titre =
    contenu.etat === 'liste'
      ? `${TEXTES_INCIDENTS.titre} (${contenu.total.toLocaleString('fr-FR')})`
      : TEXTES_INCIDENTS.titre
  return (
    <details className="border-t border-filet">
      <summary className="inline-flex min-h-cible cursor-pointer items-center text-interface font-semibold underline underline-offset-4">
        {titre}
      </summary>
      <p className="text-note text-encre-2">{TEXTES_INCIDENTS.presentation}</p>
      {contenu.etat === 'chargement' ? (
        <p role="status" className="mt-3 text-note text-encre-3">
          {TEXTES_INCIDENTS.chargement}
        </p>
      ) : null}
      {contenu.etat === 'probleme' ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 bg-alerte-fond px-4 py-3">
          <p role="alert" className="text-interface leading-normal text-alerte">
            {TEXTES_INCIDENTS.erreur}
          </p>
          <Bouton onClick={contenu.reessayer}>{TEXTES_INCIDENTS.reessayer}</Bouton>
        </div>
      ) : null}
      {contenu.etat === 'liste' && contenu.lignes.length === 0 ? (
        <p className="mt-3 text-interface text-encre-2">{TEXTES_INCIDENTS.vide}</p>
      ) : null}
      {contenu.etat === 'liste' && contenu.lignes.length > 0 ? (
        <>
          <ul className="divide-y divide-filet pb-2">
            {contenu.lignes.map((ligne) => {
              const incident = afficherIncident(ligne)
              return (
                <li key={incident.reference} className="flex flex-col gap-0.5 py-3">
                  <p className="text-interface wrap-anywhere">{incident.titre}</p>
                  <p className="text-note wrap-anywhere text-encre-3">{incident.detail}</p>
                </li>
              )
            })}
          </ul>
          {contenu.plus !== null ? (
            <Bouton
              className="mb-2"
              enCours={contenu.plusEnCours}
              libelleEnCours={TEXTES_INCIDENTS.plusEnCours}
              onClick={contenu.plus}
            >
              {TEXTES_INCIDENTS.plus}
            </Bouton>
          ) : null}
        </>
      ) : null}
    </details>
  )
}
