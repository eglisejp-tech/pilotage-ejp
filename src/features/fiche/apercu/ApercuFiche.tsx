import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { construireDernieresSaisies } from '@/features/fiche/construireDernieresSaisies'
import { construireFiche, construirePointsFiche } from '@/features/fiche/construireFiche'
import {
  COMMUNS_EXEMPLE,
  DERNIERES_SAISIES_EXEMPLE,
  lecturesExempleFiche,
  lireEcranApercuFiche,
  TABLEAU_EXEMPLE,
} from '@/features/fiche/apercu/exemplesFiche'
import { rendreCadreEmplacement } from '@/features/fiche/apercu/CadreEmplacement'
import { FicheIntrouvable } from '@/features/fiche/FicheIntrouvable'
import type { ProfilFiche } from '@/features/fiche/modeleFiche'
import { SqueletteFiche } from '@/features/fiche/SqueletteFiche'
import { TEXTES_FICHE } from '@/features/fiche/textesFiche'
import { VueFiche } from '@/features/fiche/VueFiche'
import { construireListeMinisteres } from '@/features/ministeres/construireListe'
import { VueMinisteres } from '@/features/ministeres/VueMinisteres'
import { lireProfilApercu } from '@/features/navigation/apercu/exemples'
import { ErreurDePage } from '@/pages/ErreurDePage'
import { PageNonDisponible } from '@/pages/PageNonDisponible'

const TITRE_FICHE = 'Fiche du ministère'
const reessayer = () => undefined

/**
 * Aperçu de développement de la fiche d'un ministère (maquettes 04 et 12) et de la liste des
 * ministères, sans base ni requête : les vrais composants, nourris des lignes d'exemple de
 * `exemplesFiche.ts` construites par `construireFiche`, comme dans la page. Adresse :
 * /apercu/fiche, `?profil=` choisit le lecteur (berger par défaut ; `ministere` voit sa fiche
 * avec ses boutons et ses valeurs exactes ; EJP Tech lit sans bouton ; l'administration reçoit la
 * page non disponible), `?ecran=` l'écran :
 * - `fiche` (par défaut) : la fiche de Social, avec un indicateur sensible (mois en cours,
 *   précision, répartition), des calculs, un ajout à valider, des retirés, ses points et ses
 *   dernières saisies ; ses aides sont lues par `e2e/aide.spec.ts` et `routes.test.tsx` ;
 *   Les emplacements des autres lots (prochaine réunion, chiffres par département, calendrier)
 *   y sont des cadres en pointillés, pour relire l'ordre et l'alignement de la page ;
 * - `fiche-vide` (premier usage), `fiche-erreur-bloc` (« Dernières saisies » en échec),
 *   `fiche-erreur-points` (les points en échec), `fiche-erreur-details` (le détail des sensibles
 *   en échec), `chargement`, `erreur`, `introuvable` ;
 * - `ministeres`, `ministeres-vide`, `ministeres-erreur` : la liste (berger, conseil, EJP Tech).
 * Enregistrée seulement en développement.
 */
export function ApercuFiche() {
  const [parametres] = useSearchParams()
  const ecran = lireEcranApercuFiche(parametres.get('ecran'))
  const profilDemande = lireProfilApercu(parametres.get('profil'))
  const profil: ProfilFiche | null = profilDemande === 'admin_eglise' ? null : profilDemande

  const fiche = useMemo(() => {
    if (profil === null) return null
    const exemple = lecturesExempleFiche(ecran === 'fiche-vide')
    // Détail des sensibles en échec : la fiche se construit sans catégories, répartitions ni précisions.
    const lectures =
      ecran === 'fiche-erreur-details'
        ? { ...exemple, categories: [], repartitions: [], precisions: [] }
        : exemple
    return {
      donnees: construireFiche(lectures, { profil }),
      points: construirePointsFiche(lectures, { profil }),
    }
  }, [profil, ecran])

  // L'administration n'a ni fiche ni liste (plan, E2) ; un ministère n'a pas la liste.
  if (profil === null || fiche === null) return <PageNonDisponible />
  const liste = ecran.startsWith('ministeres')
  if (liste && profil === 'ministere') return <PageNonDisponible />

  switch (ecran) {
    case 'ministeres':
      return (
        <VueMinisteres
          liste={{
            etat: 'donnees',
            donnees: construireListeMinisteres(TABLEAU_EXEMPLE, '2026-10-07'),
          }}
        />
      )
    case 'ministeres-vide':
      return <VueMinisteres liste={{ etat: 'donnees', donnees: [] }} />
    case 'ministeres-erreur':
      return <VueMinisteres liste={{ etat: 'erreur', reessayer }} />
    case 'chargement':
      return (
        <>
          <title>Aperçu, Fiche du ministère, Pilotage EJP</title>
          <SqueletteFiche titre={TITRE_FICHE} />
        </>
      )
    case 'erreur':
      return (
        <>
          <title>Aperçu, Fiche du ministère, Pilotage EJP</title>
          <h1 className="sr-only">{TITRE_FICHE}</h1>
          <ErreurDePage
            message={TEXTES_FICHE.erreur}
            libelleBouton={TEXTES_FICHE.reessayer}
            onReessayer={reessayer}
          />
        </>
      )
    case 'introuvable':
      return <FicheIntrouvable titre={TITRE_FICHE} profil={profil} />
    default:
      return (
        <>
          <title>{`Aperçu, ${fiche.donnees.ministere.nom}, Pilotage EJP`}</title>
          <VueFiche
            donnees={fiche.donnees}
            points={
              ecran === 'fiche-erreur-points'
                ? { etat: 'erreur', reessayer }
                : { etat: 'donnees', donnees: fiche.points }
            }
            reessayerDetailsSensibles={ecran === 'fiche-erreur-details' ? reessayer : null}
            dernieresSaisies={
              ecran === 'fiche-erreur-bloc'
                ? { etat: 'erreur', reessayer }
                : {
                    etat: 'donnees',
                    donnees:
                      ecran === 'fiche-vide'
                        ? []
                        : construireDernieresSaisies(DERNIERES_SAISIES_EXEMPLE, COMMUNS_EXEMPLE),
                  }
            }
            rendreEmplacement={rendreCadreEmplacement}
          />
        </>
      )
  }
}
