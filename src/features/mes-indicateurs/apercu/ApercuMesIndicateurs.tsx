import { useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { EtatBloc } from '@/features/fiche/modeleFiche'
import { lecturesNormales, lecturesVides } from '@/features/mes-indicateurs/apercu/exemples'
import { construireMesIndicateurs } from '@/features/mes-indicateurs/construire'
import type {
  DonneesMesIndicateurs,
  LecturesMesIndicateurs,
} from '@/features/mes-indicateurs/construire'
import type { FormulaireSuggestion } from '@/features/mes-indicateurs/schemas'
import { VueMesIndicateurs } from '@/features/mes-indicateurs/VueMesIndicateurs'
import { PageNonDisponible } from '@/pages/PageNonDisponible'

const ATTENTE_SIMULEE_MS = 150
const LIMITE_EXEMPLE =
  'Votre ministère a déjà 3 indicateurs à lui. Retirez-en un pour en ajouter un autre.'
const MOTIF_EXEMPLE = "N'écrivez aucun nom ni information personnelle."

/** Erreur de la base, comme postgrest-js la lève : un code SQL et son message. */
function erreurBase(code: string, message: string) {
  return { code, message }
}

const reessayer = () => undefined

/** Les lectures de départ d'une vue de l'aperçu. */
function lecturesDeDepart(vue: string): LecturesMesIndicateurs {
  switch (vue) {
    case 'vide':
      return lecturesVides()
    case 'limite': {
      const lectures = lecturesNormales()
      return {
        ...lectures,
        limites: lectures.limites === null ? null : { ...lectures.limites, ajouts: 3 },
      }
    }
    case 'toutes':
      return { ...lecturesNormales(), suggestions: [] }
    default:
      return lecturesNormales()
  }
}

/**
 * Aperçu de développement de « Mes indicateurs » (lot L4), sans base : le vrai écran, avec des
 * données d'exemple et des envois simulés. Adresse : /apercu/mes-indicateurs.
 * - `vue=normal` (défaut : 7 indicateurs, dont une suggestion à valider et un refus), `vide` (rien
 *   n'est suivi), `limite` (3 ajouts : le panneau ne montre que l'explication), `toutes` (aucune
 *   suggestion à proposer), `chargement`, `probleme` ;
 * - `?profil=ministere` (défaut) ; tout autre profil : « Page non disponible » ;
 * - `&envoi=echec` simule une connexion perdue, `&envoi=limite` un refus de limite par la base,
 *   `&envoi=motif` un refus du « Pourquoi » par la base (donnée personnelle).
 * Enregistrée seulement en développement.
 */
export function ApercuMesIndicateurs() {
  const [parametres] = useSearchParams()
  const profil = parametres.get('profil') ?? 'ministere'
  const vue = parametres.get('vue') ?? 'normal'
  const envoi = parametres.get('envoi')
  const [lectures, setLectures] = useState(() => lecturesDeDepart(vue))
  const occupe = useRef(false)

  const donnees = useMemo((): EtatBloc<DonneesMesIndicateurs> => {
    if (vue === 'chargement') return { etat: 'chargement' }
    if (vue === 'probleme') return { etat: 'erreur', reessayer }
    return { etat: 'donnees', donnees: construireMesIndicateurs(lectures) }
  }, [vue, lectures])

  /** Envoi simulé : les mêmes refus que la base, aucun appel au serveur. */
  const envoyer = async (code: string, formulaire: FormulaireSuggestion): Promise<void> => {
    void formulaire
    if (occupe.current) return
    occupe.current = true
    try {
      await new Promise((resolve) => setTimeout(resolve, ATTENTE_SIMULEE_MS))
      // L'erreur de fetch hors ligne : une autre `Error` serait lue comme un refus inattendu.
      if (envoi === 'echec') throw new TypeError('Failed to fetch')
      if (envoi === 'limite') throw erreurBase('P0001', LIMITE_EXEMPLE)
      if (envoi === 'motif') throw erreurBase('P0001', MOTIF_EXEMPLE)
      const suggestion = lectures.suggestions.find((possible) => possible.code === code)
      if (suggestion === undefined) throw erreurBase('P0001', "Cette suggestion n'existe pas.")
      const numero = lectures.indicateurs.length + 100
      const id = `00000000-0000-4000-8000-${String(numero).padStart(12, '0')}`
      setLectures((courantes) => ({
        ...courantes,
        indicateurs: [
          ...courantes.indicateurs,
          {
            id,
            libelle: suggestion.libelle,
            definition: suggestion.definition,
            nature: suggestion.nature,
            calcul: null,
            etat: 'en_attente',
            origine: 'ministere',
            modele_code: suggestion.code,
            cree_le: '2026-10-12T10:00:00+02:00',
            retire_le: null,
            retrait_motif: null,
          },
        ],
        suivi: [
          ...courantes.suivi,
          {
            indicateur_id: id,
            ministere_id: suggestion.ministere_id,
            libelle: suggestion.libelle,
            definition: suggestion.definition,
            nature: suggestion.nature,
            unite: 'nombre',
            sensible: false,
            etat: 'en_attente',
            origine: 'ministere',
            calcul: null,
            derniere_periode: null,
            derniere_valeur: null,
            derniere_moins_de_3: false,
            derniere_saisie_le: null,
            mois_en_cours_valeur: null,
            mois_en_cours_moins_de_3: false,
            somme_annee: null,
            somme_moins_de_3: false,
            somme_depuis: null,
            somme_nb_saisies: null,
            somme_nb_attendues: null,
            plus_de_30_jours: false,
            etat_valeur: 'jamais_saisi',
            attente_jours: 0,
            retire_le: null,
          },
        ],
        suggestions: courantes.suggestions.filter((possible) => possible.code !== code),
        limites:
          courantes.limites === null
            ? null
            : {
                ...courantes.limites,
                ajouts: courantes.limites.ajouts + 1,
                lignes: courantes.limites.lignes + 1,
              },
      }))
    } finally {
      occupe.current = false
    }
  }

  if (profil !== 'ministere') return <PageNonDisponible />
  return <VueMesIndicateurs titre="Mes indicateurs" donnees={donnees} envoyer={envoyer} />
}
