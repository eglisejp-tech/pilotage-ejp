import { useCallback, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  apresCreation,
  ID_COMMUNICATION,
  ID_EAGLES,
  ID_JEUNESSE,
  ID_KUMI,
  ID_PROTOCOLE,
  lecturesExemple,
  termesExemple,
} from '@/features/indicateurs/configuration/apercu/exemples'
import type { EtatSimule } from '@/features/indicateurs/configuration/apercu/simulation'
import { useEcrituresSimulees } from '@/features/indicateurs/configuration/apercu/useEcrituresSimulees'
import { MODELE_AUCUN } from '@/features/indicateurs/configuration/catalogue'
import {
  construireConfiguration,
  construireMinistere,
} from '@/features/indicateurs/configuration/construire'
import {
  reussiteAucunPrevu,
  reussiteCreationPrevus,
  TEXTES_CONFIGURATION,
} from '@/features/indicateurs/configuration/textes'
import type { CreationPrevus } from '@/features/indicateurs/configuration/useCreationPrevus'
import { VueIndicateurs } from '@/features/indicateurs/configuration/VueIndicateurs'
import { VueIndicateursMinistere } from '@/features/indicateurs/configuration/VueIndicateursMinistere'
import type { ResultatConfigurationMinistere } from '@/features/indicateurs/configuration/useLecturesConfiguration'
import type { TypeCompte } from '@/lib/base'
import { gereLOutil } from '@/lib/metier/droits'
import { PageNonDisponible } from '@/pages/PageNonDisponible'

const ATTENTE_SIMULEE_MS = 150
const REFUS_EXEMPLE =
  'La fiche a déjà « Activités réalisées » : retirez-le avant de créer les indicateurs prévus.'

const MINISTERES_PAR_VUE: Readonly<Record<string, string>> = {
  communication: ID_COMMUNICATION,
  kumi: ID_KUMI,
  eagles: ID_EAGLES,
  jeunesse: ID_JEUNESSE,
  protocole: ID_PROTOCOLE,
}

function etatInitial(): EtatSimule {
  const lectures = lecturesExemple()
  return { lectures, termes: termesExemple(lectures), compteur: 0 }
}

/** Création simulée : les mêmes messages que la base et que l'écran, aucun appel au serveur. */
function useCreationSimulee(
  courant: { current: EtatSimule },
  ecrire: (etat: EtatSimule) => void,
  envoi: string | null,
): CreationPrevus {
  const [enCours, setEnCours] = useState<string | null>(null)
  const [dernier, setDernier] = useState<string | null>(null)
  const [reussite, setReussite] = useState<string | null>(null)
  const [numero, setNumero] = useState(0)
  const [refus, setRefus] = useState<string | null>(null)
  const occupe = useRef(false)
  const creer = useCallback(
    async (ministere: { id: string; nom: string }, modele: string) => {
      if (occupe.current) return
      occupe.current = true
      setEnCours(ministere.id)
      setDernier(ministere.id)
      setRefus(null)
      await new Promise((resolve) => setTimeout(resolve, ATTENTE_SIMULEE_MS))
      if (envoi === 'echec') {
        setReussite(null)
        setRefus(TEXTES_CONFIGURATION.erreur)
      } else if (envoi === 'refus') {
        setReussite(null)
        setRefus(REFUS_EXEMPLE)
      } else {
        const resultat = apresCreation(
          courant.current.lectures,
          ministere.id,
          modele,
          new Date().toISOString(),
        )
        ecrire({ ...courant.current, lectures: resultat.lectures })
        setReussite(
          modele === MODELE_AUCUN
            ? reussiteAucunPrevu(ministere.nom)
            : reussiteCreationPrevus(resultat.nombre, ministere.nom),
        )
        setNumero((precedent) => precedent + 1)
      }
      occupe.current = false
      setEnCours(null)
    },
    [courant, ecrire, envoi],
  )
  return { creer, enCours, dernier, reussite, envoi: numero, refus }
}

const reessayer = () => undefined

/**
 * Aperçu de développement de la configuration des indicateurs (lots L3a et L3b), sans base : les
 * vrais écrans, avec des données d'exemple et des écritures simulées (créer les prévus, ajouter,
 * calculer, corriger, remplacer, retirer). Adresse : /apercu/indicateurs.
 * - `?profil=admin_plateforme` (défaut : EJP Tech configure, T60) ou `admin_eglise` (lecture, sans
 *   aucun bouton) ; tout autre profil : « Page non disponible » (l'écran est réservé à ces deux
 *   profils) ;
 * - `vue=liste` (défaut), `liste-vide` (aucun ministère), `liste-chargement`, `liste-probleme` ;
 * - `vue=communication`, `kumi` (6 prévus à créer), `eagles` (prévus créés), `jeunesse` (nom non
 *   reconnu : à choisir), `protocole` (« Aucun prévu », sans indicateur), `introuvable`,
 *   `chargement`, `probleme` : l'écran d'un ministère ;
 * - `&envoi=echec` simule une connexion perdue, `&envoi=refus` un refus de la base.
 * Enregistrée seulement en développement.
 */
export function ApercuIndicateurs() {
  const [parametres] = useSearchParams()
  const profil = parametres.get('profil')
  const vue = parametres.get('vue') ?? 'liste'
  const envoi = parametres.get('envoi')
  const [etat, setEtat] = useState<EtatSimule>(etatInitial)
  // Les écritures se suivent sans attendre le rendu : la référence garde l'état le plus récent.
  const courant = useRef(etat)
  const ecrire = useCallback((suivant: EtatSimule) => {
    courant.current = suivant
    setEtat(suivant)
  }, [])
  const lectures = etat.lectures
  const creation = useCreationSimulee(courant, ecrire, envoi)
  const ecritures = useEcrituresSimulees(courant, ecrire, envoi)
  if (profil !== null && profil !== 'admin_eglise' && profil !== 'admin_plateforme') {
    return <PageNonDisponible />
  }
  const profilLecteur: TypeCompte = profil ?? 'admin_plateforme'

  const idMinistere = MINISTERES_PAR_VUE[vue]
  if (idMinistere !== undefined || ['introuvable', 'chargement', 'probleme'].includes(vue)) {
    let ministere: ResultatConfigurationMinistere
    if (vue === 'chargement') ministere = { etat: 'chargement' }
    else if (vue === 'probleme') ministere = { etat: 'erreur', reessayer }
    else {
      const donnees = idMinistere === undefined ? null : construireMinistere(idMinistere, lectures)
      ministere = donnees === null ? { etat: 'introuvable' } : { etat: 'pret', donnees }
    }
    return (
      <VueIndicateursMinistere
        titre="Indicateurs d'un ministère"
        profil={profilLecteur}
        ministere={ministere}
        creation={creation}
        ecritures={gereLOutil(profilLecteur) ? ecritures : undefined}
      />
    )
  }

  const configuration =
    vue === 'liste-chargement'
      ? ({ etat: 'chargement' } as const)
      : vue === 'liste-probleme'
        ? ({ etat: 'erreur', reessayer } as const)
        : ({
            etat: 'donnees',
            donnees: construireConfiguration(
              vue === 'liste-vide' ? { ...lectures, ministeres: [] } : lectures,
              profilLecteur,
            ),
          } as const)
  return (
    <VueIndicateurs
      titre="Indicateurs"
      profil={profilLecteur}
      configuration={configuration}
      creation={creation}
    />
  )
}
