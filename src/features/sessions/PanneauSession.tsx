import { useEffect, useState } from 'react'
import { ChargementBloc } from '@/features/fiche/ChargementBloc'
import { PanneauSaisie } from '@/features/saisie/PanneauSaisie'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'
import { designationDeclaration } from '@/features/sessions/construire'
import type { LigneSession } from '@/features/sessions/construire'
import { FormulaireSession } from '@/features/sessions/FormulaireSession'
import { lireRefusSession } from '@/features/sessions/refus'
import { REUSSITES_SESSIONS, TEXTES_SESSIONS } from '@/features/sessions/textes'
import type { ActionsSessions, DonneesSessions } from '@/features/sessions/types'

/** Le panneau ouvert sur l'écran 14. */
export type PanneauOuvert = { genre: 'declarer' } | { genre: 'modifier'; ligne: LigneSession }

interface Props {
  panneau: PanneauOuvert
  donnees: DonneesSessions
  actions: ActionsSessions
  /** Écriture réussie : le panneau se ferme et la page affiche ce message. */
  onFait: (message: string) => void
  onFermer: () => void
}

type Attendus =
  { etat: 'chargement' } | { etat: 'erreur'; message: string } | { etat: 'pret'; ids: string[] }

/** Ministères attendus d'une session, lus à l'ouverture de « Modifier ». */
function useAttendus(lire: ActionsSessions['lireAttendus'], sessionId: string): Attendus {
  const [attendus, setAttendus] = useState<Attendus>({ etat: 'chargement' })
  useEffect(() => {
    let courant = true
    lire(sessionId).then(
      (ids) => {
        if (courant) setAttendus({ etat: 'pret', ids })
      },
      (erreur: unknown) => {
        if (courant) {
          setAttendus({
            etat: 'erreur',
            message: lireRefusSession(erreur, TEXTES_SESSIONS.erreurConnexionSuppression),
          })
        }
      },
    )
    return () => {
      courant = false
    }
  }, [lire, sessionId])
  return attendus
}

function Modification({
  ligne,
  donnees,
  actions,
  onFait,
  onFermer,
}: Omit<Props, 'panneau'> & { ligne: LigneSession }) {
  const attendus = useAttendus(actions.lireAttendus, ligne.id)
  if (attendus.etat === 'chargement') return <ChargementBloc />
  if (attendus.etat === 'erreur') return <ErreurFormulaire message={attendus.message} />
  // Un ministère désactivé depuis garde sa ligne, mais l'écran ne le propose plus.
  const proposes = new Set(donnees.ministeres.map((ministere) => ministere.id))
  return (
    <>
      <p className="leading-normal text-encre-2">{TEXTES_SESSIONS.noteModification}</p>
      <FormulaireSession
        mode="modifier"
        id="session-modifier"
        aujourdhui={donnees.aujourdhui}
        ministeres={donnees.ministeres}
        coches={attendus.ids.filter((id) => proposes.has(id))}
        envoyer={async (valeurs) => {
          await actions.modifier(ligne.id, valeurs.ministeres)
          onFait(REUSSITES_SESSIONS.modifiee(ligne.designation))
        }}
        onAnnuler={onFermer}
      />
    </>
  )
}

/**
 * Panneaux de l'écran 14 sous 1024 px (« Déclarer une session ») et à toute largeur
 * (« Modifier ») : page entière sous 600 px, panneau de 460 px au-delà (`PanneauSaisie`).
 */
export function PanneauSession({ panneau, donnees, actions, onFait, onFermer }: Props) {
  if (panneau.genre === 'modifier') {
    return (
      <PanneauSaisie
        titre={`${TEXTES_SESSIONS.modifier} ${panneau.ligne.designation}`}
        surtitre={TEXTES_SESSIONS.surtitre}
        onFermer={onFermer}
      >
        <Modification
          ligne={panneau.ligne}
          donnees={donnees}
          actions={actions}
          onFait={onFait}
          onFermer={onFermer}
        />
      </PanneauSaisie>
    )
  }
  return (
    <PanneauSaisie
      titre={TEXTES_SESSIONS.declarer}
      surtitre={TEXTES_SESSIONS.surtitre}
      onFermer={onFermer}
    >
      <FormulaireSession
        mode="declarer"
        id="session-declarer-panneau"
        aujourdhui={donnees.aujourdhui}
        ministeres={donnees.ministeres}
        envoyer={async (valeurs) => {
          await actions.declarer(valeurs)
          onFait(REUSSITES_SESSIONS.declaree(designationDeclaration(valeurs)))
        }}
        onAnnuler={onFermer}
      />
    </PanneauSaisie>
  )
}
