import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { construireAlerte } from '@/features/cette-semaine/construireAlerte'
import { EvenementsAConfirmer } from '@/features/cette-semaine/EvenementsAConfirmer'
import type { EtatAConfirmer } from '@/features/cette-semaine/EvenementsAConfirmer'
import {
  A_CONFIRMER_EXEMPLE,
  lecturesCalendrierExemple,
  lireEcranApercuCalendrier,
  MINISTERES_EXEMPLE,
  REUNION_EXEMPLE,
} from '@/features/calendrier/apercu/exemplesCalendrier'
import { construireCalendrier } from '@/features/fiche/construireCalendrier'
import { construireDernieresSaisies } from '@/features/fiche/construireDernieresSaisies'
import { construireFiche, construirePointsFiche } from '@/features/fiche/construireFiche'
import { construireReunion } from '@/features/fiche/construireReunion'
import {
  COMMUNS_EXEMPLE,
  DERNIERES_SAISIES_EXEMPLE,
  lecturesExempleFiche,
} from '@/features/fiche/apercu/exemplesFiche'
import type { ProfilFiche } from '@/features/fiche/modeleFiche'
import type { EmplacementFiche, ProprietesEmplacementFiche } from '@/features/fiche/types'
import { VueCalendrier } from '@/features/fiche/VueCalendrier'
import type { EtatCalendrier } from '@/features/fiche/VueCalendrier'
import { VueFiche } from '@/features/fiche/VueFiche'
import { VueReunion } from '@/features/fiche/VueReunion'
import type { EtatReunion } from '@/features/fiche/VueReunion'
import { lireProfilApercu } from '@/features/navigation/apercu/exemples'
import { PageNonDisponible } from '@/pages/PageNonDisponible'
import { litTout } from '@/lib/metier/droits'

const reessayer = () => undefined

/**
 * Aperçu de développement du calendrier, de la prochaine réunion et de l'alerte des événements à
 * confirmer (maquettes 04 et 12, T31 ; lot E6), sans base ni requête : les vrais composants,
 * nourris de lignes d'exemple (mercredi 7 octobre 2026). Adresse : /apercu/calendrier, `?profil=`
 * choisit le lecteur (berger par défaut ; `ministere` voit sa fiche avec ses boutons ; l'EJP Tech
 * lit sans bouton ; l'administration de l'église n'a ni fiche ni bloc), `?ecran=` l'écran :
 * - `fiche` (par défaut) : la fiche de Social, avec son calendrier et sa prochaine réunion, sans
 *   événement à confirmer (donc sans bandeau) ;
 * - `fiche-alerte` : un événement de Social à confirmer à 3 jours, un autre passé de plus de
 *   7 jours, un événement de Coordination qui mentionne Social, et le bandeau d'alerte ;
 * - `fiche-vide` (« Aucun événement prévu. », réunion « Non renseignée. » ou « Renseigner »),
 *   `fiche-erreur`, `fiche-chargement` ;
 * - `a-confirmer` : le bloc « Événements à confirmer » de « Cette semaine » (8 lignes, 5 puis
 *   « Voir les 8 événements à confirmer »), `a-confirmer-un`, `a-confirmer-vide` (le bloc
 *   disparaît), `a-confirmer-erreur`. Le bloc n'est montré qu'au berger, au conseil et à EJP Tech.
 * Enregistrée seulement en développement.
 */
export function ApercuCalendrier() {
  const [parametres] = useSearchParams()
  const ecran = lireEcranApercuCalendrier(parametres.get('ecran'))
  const profil = lireProfilApercu(parametres.get('profil'))
  const bloc = ecran.startsWith('a-confirmer')

  const fiche = useMemo(() => {
    if (profil === 'admin_eglise') return null
    const lectures = lecturesExempleFiche(false)
    return {
      donnees: construireFiche(lectures, { profil }),
      points: construirePointsFiche(lectures, { profil }),
    }
  }, [profil])

  const calendrier = useMemo((): EtatCalendrier => {
    if (ecran === 'fiche-chargement') return { etat: 'chargement' }
    if (ecran === 'fiche-erreur') return { etat: 'erreur', reessayer }
    return {
      etat: 'donnees',
      lignes: construireCalendrier(lecturesCalendrierExemple(ecran), {
        ministereId: fiche?.donnees.ministere.id ?? '',
        profil,
      }),
    }
  }, [ecran, fiche, profil])

  const reunion = useMemo((): EtatReunion => {
    if (ecran === 'fiche-chargement') return { etat: 'chargement' }
    if (ecran === 'fiche-erreur') return { etat: 'erreur', reessayer }
    return {
      etat: 'donnees',
      reunion: construireReunion(ecran === 'fiche-vide' ? null : REUNION_EXEMPLE),
    }
  }, [ecran])

  if (bloc) {
    return <ApercuBloc ecran={ecran} voit={litTout(profil)} />
  }
  if (fiche === null || profil === 'admin_eglise') return <PageNonDisponible />

  const poser = (
    emplacement: EmplacementFiche,
    proprietes: ProprietesEmplacementFiche,
  ): ReactNode =>
    emplacement === 'calendrier' ? (
      <VueCalendrier etat={calendrier} profil={proprietes.profil} />
    ) : emplacement === 'reunion' ? (
      <VueReunion etat={reunion} peutSaisir={proprietes.profil === 'ministere'} />
    ) : null
  const profilFiche: ProfilFiche = profil
  return (
    <>
      <title>{`Aperçu, ${fiche.donnees.ministere.nom}, Pilotage EJP`}</title>
      <VueFiche
        key={profilFiche}
        donnees={fiche.donnees}
        points={{ etat: 'donnees', donnees: fiche.points }}
        dernieresSaisies={{
          etat: 'donnees',
          donnees: construireDernieresSaisies(DERNIERES_SAISIES_EXEMPLE, COMMUNS_EXEMPLE),
        }}
        rendreEmplacement={poser}
      />
    </>
  )
}

function ApercuBloc({ ecran, voit }: { ecran: string; voit: boolean }) {
  const etat = useMemo((): EtatAConfirmer => {
    if (ecran === 'a-confirmer-erreur') return { etat: 'erreur', reessayer }
    if (ecran === 'a-confirmer-vide') return { etat: 'donnees', lignes: [] }
    const evenements =
      ecran === 'a-confirmer-un' ? A_CONFIRMER_EXEMPLE.slice(5, 6) : A_CONFIRMER_EXEMPLE
    return { etat: 'donnees', lignes: construireAlerte(evenements, MINISTERES_EXEMPLE) }
  }, [ecran])
  return (
    <>
      <title>Aperçu, Événements à confirmer, Pilotage EJP</title>
      <h1 className="sr-only">Cette semaine, aperçu des événements à confirmer</h1>
      {voit ? (
        <div className="max-w-[23.75rem]">
          <EvenementsAConfirmer etat={etat} />
        </div>
      ) : (
        <p className="text-note text-encre-3">Ce profil ne voit pas ce bloc.</p>
      )}
    </>
  )
}
