import { EtatVide } from '@/components/etats/EtatVide'
import { PanneauSaisie } from '@/features/saisie/PanneauSaisie'
import { ChargementSaisie } from '@/features/saisie-session/ChargementSaisie'
import { FormulaireSession } from '@/features/saisie-session/FormulaireSession'
import { adresseSaisieSession, TEXTES_SESSION } from '@/features/saisie-session/session'
import { useSaisieSession } from '@/features/saisie-session/useSaisieSession'
import { LienSignalement } from '@/features/signalement/LienSignalement'
import { titreSession } from '@/lib/metier/phrases'

interface Props {
  sessionId: string
  ministereId: string
  /** Titre de l'adresse (« Saisie d'une session »), tant que la session n'est pas lue. */
  titre: string
  onFermer: () => void
}

/** Texte du problème passager (LISEZMOI, « Erreur de page »). */
const CONNEXION_ECHOUEE = 'La connexion a échoué. Réessayez.'

/**
 * Saisie d'une session (maquette 09) avec ses lectures : chargement, problème passager, session
 * introuvable ou future, puis le formulaire. Le panneau garde sa place dans chaque état.
 */
export function SaisieSessionConnectee({ sessionId, ministereId, titre, onFermer }: Props) {
  const etat = useSaisieSession(sessionId, ministereId)
  const session = etat.etat === 'pret' || etat.etat === 'future' ? etat.session : null

  return (
    <PanneauSaisie
      titre={session ? titreSession(session.type, session.intitule, session.date) : titre}
      surtitre="Session déclarée par l'administration"
      onFermer={onFermer}
    >
      {etat.etat === 'chargement' ? <ChargementSaisie /> : null}
      {etat.etat === 'erreur' ? (
        <EtatVide
          situation="probleme_passager"
          action={{ libelle: 'Réessayer', surClic: etat.reessayer }}
        >
          {CONNEXION_ECHOUEE}
        </EtatVide>
      ) : null}
      {etat.etat === 'introuvable' ? (
        <EtatVide
          situation="aucun_resultat"
          action={{ libelle: TEXTES_SESSION.autreSession, vers: adresseSaisieSession() }}
        >
          {TEXTES_SESSION.introuvable}
        </EtatVide>
      ) : null}
      {etat.etat === 'future' ? (
        <EtatVide
          situation="en_attente_des_autres"
          action={{ libelle: TEXTES_SESSION.autreSession, vers: adresseSaisieSession() }}
        >
          {TEXTES_SESSION.future}
        </EtatVide>
      ) : null}
      {etat.etat === 'pret' ? (
        <FormulaireSession
          session={{
            sessionId: etat.session.session_id,
            type: etat.session.type,
            intitule: etat.session.intitule,
            date: etat.session.date,
            nbSaisis: etat.session.nb_saisis,
            nbAttendus: etat.session.nb_attendus,
            manquants: etat.session.manquants,
          }}
          ministereId={ministereId}
          precedente={etat.precedente}
          dejaSaisi={etat.dejaSaisi}
          enregistrer={etat.enregistrer}
        />
      ) : (
        // Le formulaire porte son propre lien ; session absente, future ou panne : celui-ci.
        <LienSignalement ecran="saisie_session" />
      )}
    </PanneauSaisie>
  )
}
