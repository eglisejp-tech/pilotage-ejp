import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import {
  contenuEvenement,
  contenuReunion,
  lireEcranApercu,
} from '@/features/evenements/apercu/exemples'
import { PanneauEvenement } from '@/features/evenements/PanneauEvenement'
import { PanneauReunion } from '@/features/evenements/PanneauReunion'

const fermer = () => undefined

/**
 * Aperçu de développement des saisies d'événement et de réunion (maquette 11 et panneaux
 * dérivés), sans base : les vrais panneaux, avec les données d'exemple et des envois simulés.
 * Adresse : /apercu/evenements, `?ecran=` choisit l'écran :
 * - `ajout` (par défaut) : « Ajouter un événement », trois aides (date, statut, mentions), lues
 *   par `e2e/aide.spec.ts` et `routes.test.tsx` ; `sans-mention` : aucun autre ministère actif ;
 * - `mise-a-jour`, `a-confirmer` : « Mettre à jour l'événement » (une ligne identique est refusée
 *   comme par la base, une nouvelle date fait paraître « Report : ... » et son aide) ;
 * - `pas-porteur`, `introuvable`, `chargement`, `probleme` : les états du panneau ;
 * - `reunion`, `reunion-modifier`, `reunion-probleme` : « Prochaine réunion ».
 * `&envoi=echec` simule une connexion perdue à l'envoi. Le lot E6 (calendrier, alerte) y ajoute
 * ses écrans. Enregistrée seulement en développement.
 */
export function ApercuEvenements() {
  const [parametres] = useSearchParams()
  const ecran = lireEcranApercu(parametres.get('ecran'))
  const echec = parametres.get('envoi') === 'echec'
  // Un contenu par écran : ses envois simulés gardent l'état enregistré d'un envoi à l'autre.
  const evenement = useMemo(() => contenuEvenement(ecran, echec), [ecran, echec])
  const reunion = useMemo(() => contenuReunion(ecran, echec), [ecran, echec])

  // Le titre de l'onglet est celui du panneau (« Ajouter un événement, Pilotage EJP »).
  return ecran.startsWith('reunion') ? (
    <PanneauReunion key={ecran} contenu={reunion} onFermer={fermer} />
  ) : (
    <PanneauEvenement key={ecran} contenu={evenement} onFermer={fermer} />
  )
}
