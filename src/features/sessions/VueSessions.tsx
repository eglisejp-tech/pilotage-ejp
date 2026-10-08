import { useEffect, useId, useRef, useState } from 'react'
import { EtatVide } from '@/components/etats/EtatVide'
import { TitreSection } from '@/features/cette-semaine/TitreSection'
import { useLargeurMin } from '@/features/cette-semaine/useLargeurMin'
import { BoutonAjout } from '@/features/comptes/BoutonAjout'
import { FenetreConfirmation } from '@/features/comptes/FenetreConfirmation'
import { ChargementBloc } from '@/features/fiche/ChargementBloc'
import type { EtatBloc } from '@/features/fiche/modeleFiche'
import { MessageReussite } from '@/features/saisie/MessageReussite'
import { LARGEUR_PANNEAU } from '@/features/saisie/textes'
import { designationDeclaration } from '@/features/sessions/construire'
import type { LigneSession } from '@/features/sessions/construire'
import { FormulaireSession } from '@/features/sessions/FormulaireSession'
import { ListeSessions } from '@/features/sessions/ListeSessions'
import { PanneauSession } from '@/features/sessions/PanneauSession'
import type { PanneauOuvert } from '@/features/sessions/PanneauSession'
import { lireRefusSession } from '@/features/sessions/refus'
import {
  confirmationSupprimer,
  REUSSITES_SESSIONS,
  TEXTES_SESSIONS,
} from '@/features/sessions/textes'
import type { ActionsSessions, DonneesSessions } from '@/features/sessions/types'
import { ErreurDePage } from '@/pages/ErreurDePage'

/** Largeur à partir de laquelle la colonne « Déclarer une session » est dans la page (maquette 14). */
const LARGEUR_COLONNE = 1024

interface Props {
  titre: string
  donnees: EtatBloc<DonneesSessions>
  actions: ActionsSessions
}

/** Le focus n'est plus nulle part : son élément a disparu (bouton supprimé, panneau fermé). */
function focusPerdu(): boolean {
  const actif = document.activeElement
  return actif === null || actif === document.body || !actif.isConnected
}

/**
 * Écran 14, « Sessions » (administration de l'église ; maquette 14, BRIEF section 9) : titre et
 * phrase, la liste des sessions déclarées et, à partir de 1024 px, la colonne « Déclarer une
 * session » à droite. Sous 1024 px, le bouton « Déclarer une session » ouvre le même formulaire
 * dans un panneau (page entière sous 600 px). « Modifier » ouvre toujours un panneau ;
 * « Supprimer » passe par une fenêtre de confirmation. La réussite s'affiche en haut de la page,
 * 6 secondes. Quand le bouton qui avait le focus disparaît, le focus va au titre.
 */
export function VueSessions({ titre, donnees, actions }: Props) {
  const idListe = useId()
  const avecColonne = useLargeurMin(LARGEUR_COLONNE)
  const enPanneau = useLargeurMin(LARGEUR_PANNEAU)
  const titreRef = useRef<HTMLHeadingElement>(null)
  const [panneau, setPanneau] = useState<PanneauOuvert | null>(null)
  const [aSupprimer, setASupprimer] = useState<LigneSession | null>(null)
  const [reussite, setReussite] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(0)

  // Sous 600 px, le panneau prend la page entière, à côté de la région des messages.
  const pleinePage = panneau !== null && !enPanneau
  const pleinePagePrecedente = useRef(pleinePage)
  useEffect(() => {
    const etait = pleinePagePrecedente.current
    pleinePagePrecedente.current = pleinePage
    if (etait && !pleinePage && focusPerdu()) titreRef.current?.focus()
  }, [pleinePage])

  useEffect(() => {
    if (envoi > 0 && focusPerdu()) titreRef.current?.focus()
  }, [envoi])

  const annoncer = (message: string) => {
    setReussite(message)
    setEnvoi((n) => n + 1)
  }
  const fermerPanneau = () => setPanneau(null)
  const apresPanneau = (message: string) => {
    setPanneau(null)
    annoncer(message)
  }

  const pret = donnees.etat === 'donnees' ? donnees.donnees : null
  const colonne =
    pret && avecColonne ? (
      <aside
        aria-labelledby={`${idListe}-declarer`}
        className="flex flex-col gap-5 border border-filet bg-papier p-6"
      >
        <h2
          id={`${idListe}-declarer`}
          className="font-lecture text-[28px] leading-[1.1] font-medium"
        >
          {TEXTES_SESSIONS.declarer}
        </h2>
        <FormulaireSession
          mode="declarer"
          id="session-declarer"
          aujourdhui={pret.aujourdhui}
          ministeres={pret.ministeres}
          envoyer={async (valeurs) => {
            await actions.declarer(valeurs)
            annoncer(REUSSITES_SESSIONS.declaree(designationDeclaration(valeurs)))
          }}
        />
      </aside>
    ) : null

  return (
    <div className="flex flex-col gap-10">
      {pleinePage ? null : (
        <div className="flex flex-col gap-6 min-[1024px]:flex-row min-[1024px]:items-end min-[1024px]:justify-between">
          <div className="flex flex-col gap-2.5">
            <h1
              ref={titreRef}
              tabIndex={-1}
              className="font-lecture text-titre leading-[1.1] font-medium focus:outline-hidden"
            >
              {titre}
            </h1>
            <p className="max-w-[720px] leading-relaxed text-encre-2">
              {TEXTES_SESSIONS.introduction}
            </p>
          </div>
          {pret && !avecColonne ? (
            <BoutonAjout
              principal
              libelle={TEXTES_SESSIONS.declarer}
              onClick={() => setPanneau({ genre: 'declarer' })}
            />
          ) : null}
        </div>
      )}

      <div className="-my-5">
        <MessageReussite message={reussite} envoi={envoi} />
      </div>

      {!pleinePage && donnees.etat === 'chargement' ? <ChargementBloc /> : null}
      {!pleinePage && donnees.etat === 'erreur' ? (
        <ErreurDePage
          message={TEXTES_SESSIONS.erreur}
          libelleBouton={TEXTES_SESSIONS.reessayer}
          onReessayer={donnees.reessayer}
        />
      ) : null}
      {!pleinePage && pret ? (
        <div className="grid grid-cols-1 items-start gap-10 min-[1024px]:grid-cols-[minmax(0,1fr)_400px]">
          <section aria-labelledby={idListe} className="flex min-w-0 flex-col">
            <TitreSection id={idListe} titre={TEXTES_SESSIONS.titreListe} />
            {pret.lignes.length === 0 ? (
              <EtatVide situation="premier_usage">{TEXTES_SESSIONS.vide}</EtatVide>
            ) : (
              <ListeSessions
                lignes={pret.lignes}
                idTitre={idListe}
                onModifier={(ligne) => setPanneau({ genre: 'modifier', ligne })}
                onSupprimer={setASupprimer}
              />
            )}
          </section>
          {colonne}
        </div>
      ) : null}

      {pret && panneau ? (
        <PanneauSession
          panneau={panneau}
          donnees={pret}
          actions={actions}
          onFait={apresPanneau}
          onFermer={fermerPanneau}
        />
      ) : null}

      {aSupprimer ? (
        <FenetreConfirmation
          confirmation={confirmationSupprimer(aSupprimer.designation)}
          lireMessage={(refus) =>
            lireRefusSession(refus, TEXTES_SESSIONS.erreurConnexionSuppression)
          }
          onConfirmer={async () => {
            await actions.supprimer(aSupprimer.id)
            setASupprimer(null)
            annoncer(REUSSITES_SESSIONS.supprimee(aSupprimer.designation))
          }}
          onAnnuler={() => setASupprimer(null)}
        />
      ) : null}
    </div>
  )
}
