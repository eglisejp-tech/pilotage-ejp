import { BlocChiffresParDepartement } from '@/features/fiche/BlocChiffresParDepartement'
import type { EtatBlocFij } from '@/features/fiche/BlocChiffresParDepartement'
import { construireChiffresParDepartement } from '@/features/fiche/donneesChiffresParDepartement'
import { lireProfilApercu } from '@/features/navigation/apercu/exemples'
import { PanneauSaisie } from '@/features/saisie/PanneauSaisie'
import {
  CARTE_EXEMPLE,
  DIMANCHE_EXEMPLE,
  envoiApercu,
  SAISIE_SESSION_EXEMPLE,
  SESSION_EXEMPLE,
  SESSIONS_A_CHOISIR,
  statistiquesExemple,
} from '@/features/saisie-fij/apercu/exemplesE4'
import type { EcranApercuE4 } from '@/features/saisie-fij/apercu/exemplesE4'
import { FormulaireCarteFij } from '@/features/saisie-fij/FormulaireCarteFij'
import { FormulaireStatistiquesFij } from '@/features/saisie-fij/FormulaireStatistiquesFij'
import { ChargementSaisie } from '@/features/saisie-session/ChargementSaisie'
import { ChoixSession } from '@/features/saisie-session/ChoixSession'
import { FormulaireSession } from '@/features/saisie-session/FormulaireSession'
import { TEXTES_SESSION } from '@/features/saisie-session/session'
import { LienSignalement } from '@/features/signalement/LienSignalement'
import { titreSession } from '@/lib/metier/phrases'

interface Props {
  ecran: EcranApercuE4
  /** `?etat=` : variante de l'écran (correction, erreur, premier-usage, vide...). */
  etat: string | null
  /** `?profil=` : le bloc de lecture montre l'action au seul ministère. */
  profil: string | null
}

const fermer = () => undefined

/** Bloc « Chiffres par département » dans l'état demandé (`?etat=`). */
function blocApercu(etat: string | null): EtatBlocFij {
  if (etat === 'chargement') return { etat: 'chargement' }
  if (etat === 'erreur') return { etat: 'erreur', reessayer: () => undefined }
  const forme = etat === 'premier-usage' || etat === 'semaine-vide' ? etat : 'donnees'
  const construit = construireChiffresParDepartement(statistiquesExemple(forme))
  if (construit === null || construit.situation === 'premier_usage') {
    return { etat: 'premier_usage' }
  }
  return { etat: 'donnees', donnees: construit.donnees }
}

/**
 * Aperçus de développement du lot E4, sans base ni envoi (/apercu/saisies?ecran=...) : saisie
 * d'une session (09), « Choisir la session », carte des FIJ, chiffres par département et bloc de
 * lecture de la fiche de Coordo FIJ, chacun avec ses états (`?etat=`). Données d'exemple.
 */
export function ApercuSaisiesE4({ ecran, etat, profil }: Props) {
  const echec = etat === 'erreur'
  switch (ecran) {
    case 'session':
      return (
        <>
          <title>Aperçu, Saisie d'une session, Pilotage EJP</title>
          <PanneauSaisie
            titre={titreSession(
              SESSION_EXEMPLE.type,
              SESSION_EXEMPLE.intitule,
              SESSION_EXEMPLE.date,
            )}
            surtitre="Session déclarée par l'administration"
            onFermer={fermer}
          >
            <FormulaireSession
              session={SESSION_EXEMPLE}
              ministereId="ministere-exemple"
              precedente={12}
              dejaSaisi={etat === 'correction' ? SAISIE_SESSION_EXEMPLE : null}
              enregistrer={envoiApercu(echec)}
            />
          </PanneauSaisie>
        </>
      )
    case 'choix-session':
      return (
        <>
          <title>Aperçu, Choisir la session, Pilotage EJP</title>
          <PanneauSaisie titre={TEXTES_SESSION.titreChoix} onFermer={fermer}>
            {etat === 'chargement' ? (
              <ChargementSaisie />
            ) : (
              <ChoixSession
                sessions={
                  etat === 'vide'
                    ? []
                    : etat === 'toutes-saisies'
                      ? SESSIONS_A_CHOISIR.map((session) => ({
                          ...session,
                          presentsSaisis: session.presentsSaisis ?? 11,
                        }))
                      : SESSIONS_A_CHOISIR
                }
              />
            )}
            <LienSignalement ecran="saisie_session" />
          </PanneauSaisie>
        </>
      )
    case 'carte-fij':
      return (
        <>
          <title>Aperçu, Carte des FIJ, Pilotage EJP</title>
          <PanneauSaisie titre="Carte des FIJ" surtitre="FIJ en Île-de-France" onFermer={fermer}>
            <FormulaireCarteFij
              carte={etat === 'premier-usage' ? [] : CARTE_EXEMPLE}
              enregistrer={envoiApercu(echec)}
            />
          </PanneauSaisie>
        </>
      )
    case 'chiffres-departement':
      return (
        <>
          <title>Aperçu, Chiffres par département, Pilotage EJP</title>
          <PanneauSaisie
            titre="Chiffres par département"
            surtitre="FIJ en Île-de-France"
            onFermer={fermer}
          >
            <FormulaireStatistiquesFij
              dimancheReference={DIMANCHE_EXEMPLE}
              statistiques={statistiquesExemple(
                etat === 'premier-usage' ? 'premier-usage' : 'donnees',
              )}
              enregistrer={envoiApercu(echec)}
            />
          </PanneauSaisie>
        </>
      )
    case 'bloc-departements':
      return (
        <>
          <title>Aperçu, Chiffres par département de la fiche, Pilotage EJP</title>
          <h1 className="font-lecture text-titre leading-tight font-medium">Coordo FIJ</h1>
          <div className="mt-2 mb-8 border-t-2 border-encre" />
          <div className="max-w-[1025px]">
            <BlocChiffresParDepartement
              bloc={blocApercu(etat)}
              peutSaisir={lireProfilApercu(profil) === 'ministere'}
            />
          </div>
        </>
      )
  }
}
