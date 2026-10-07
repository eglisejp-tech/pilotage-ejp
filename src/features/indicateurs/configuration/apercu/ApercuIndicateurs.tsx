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
} from '@/features/indicateurs/configuration/apercu/exemples'
import { MODELE_AUCUN } from '@/features/indicateurs/configuration/catalogue'
import {
  construireConfiguration,
  construireMinistere,
} from '@/features/indicateurs/configuration/construire'
import type { LecturesConfiguration } from '@/features/indicateurs/configuration/construire'
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

/** Création simulée : les mêmes messages que la base et que l'écran, aucun appel au serveur. */
function useCreationSimulee(
  setLectures: (appliquer: (lectures: LecturesConfiguration) => LecturesConfiguration) => void,
  lectures: LecturesConfiguration,
  envoi: string | null,
): CreationPrevus {
  const [enCours, setEnCours] = useState<string | null>(null)
  const [reussite, setReussite] = useState<string | null>(null)
  const [numero, setNumero] = useState(0)
  const [refus, setRefus] = useState<string | null>(null)
  const occupe = useRef(false)
  const creer = useCallback(
    async (ministere: { id: string; nom: string }, modele: string) => {
      if (occupe.current) return
      occupe.current = true
      setEnCours(ministere.id)
      setRefus(null)
      await new Promise((resolve) => setTimeout(resolve, ATTENTE_SIMULEE_MS))
      if (envoi === 'echec') {
        setReussite(null)
        setRefus(TEXTES_CONFIGURATION.erreur)
      } else if (envoi === 'refus') {
        setReussite(null)
        setRefus(REFUS_EXEMPLE)
      } else {
        const resultat = apresCreation(lectures, ministere.id, modele, new Date().toISOString())
        setLectures(() => resultat.lectures)
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
    [envoi, lectures, setLectures],
  )
  return { creer, enCours, reussite, envoi: numero, refus }
}

const reessayer = () => undefined

/**
 * Aperçu de développement de la configuration des indicateurs (lot L3a), sans base : les vrais
 * écrans, avec des données d'exemple et des créations simulées. Adresse : /apercu/indicateurs.
 * - `?profil=admin_eglise` (défaut) ou `admin_plateforme` ; tout autre profil : « Page non
 *   disponible » (l'écran est réservé à ces deux profils) ;
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
  const [lectures, setLectures] = useState(lecturesExemple)
  const creation = useCreationSimulee(setLectures, lectures, envoi)
  if (profil !== null && profil !== 'admin_eglise' && profil !== 'admin_plateforme') {
    return <PageNonDisponible />
  }
  const profilLecteur: TypeCompte = profil ?? 'admin_eglise'

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
