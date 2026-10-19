import { useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { DecisionRecente } from '@/data/validationIndicateurs'
import { TEXTE_MASQUE } from '@/features/cette-semaine/textesVides'
import type { EtatBloc } from '@/features/fiche/modeleFiche'
import {
  ATTENTES_EXEMPLE,
  DECISIONS_EXEMPLE,
  DEMANDES_EXEMPLE,
  RETRAITS_EXEMPLE,
} from '@/features/indicateurs/validation/apercu/exemples'
import {
  construireDecidees,
  construireLignesAdministration,
  construireLignesEjpTech,
  construireRetraitsMinisteres,
} from '@/features/indicateurs/validation/construire'
import type {
  LigneAValider,
  LigneDecidee,
  LigneRetraitMinistere,
} from '@/features/indicateurs/validation/construire'
import type { ActionsLigne } from '@/features/indicateurs/validation/LigneAValider'
import { MESSAGES_BASE_VALIDATION } from '@/features/indicateurs/validation/textes'
import { VueAValider } from '@/features/indicateurs/validation/VueAValider'
import { PageNonDisponible } from '@/pages/PageNonDisponible'

const ATTENTE_SIMULEE_MS = 150
const MOTIF_REFUSE_EXEMPLE = "N'écrivez aucun nom ni information personnelle."

/** Erreur de la base, comme postgrest-js la lève : un code SQL et son message. */
function erreurBase(code: string, message: string) {
  return { code, message }
}

const reessayer = () => undefined

/**
 * Aperçu de développement du bloc « À valider » (lot L4), sans base : le vrai bloc, avec des données
 * d'exemple et des décisions simulées. Adresse : /apercu/validation-indicateurs.
 * - `?profil=admin_plateforme` (défaut : EJP Tech décide et lit le « Pourquoi ») ou `admin_eglise`
 *   (lit l'attente sans bouton ni « Pourquoi ») ; tout autre profil : « Page non disponible » ;
 * - `vue=liste` (défaut), `vide` (rien n'attend), `chargement`, `probleme`, `decisions-probleme`
 *   (la liste « Décidées » ne se lit pas), `retraits-probleme` (la liste des retraits faits par les
 *   ministères, T62, ne se lit pas) ;
 * - `&envoi=echec` simule une connexion perdue, `&envoi=decidee` une demande déjà décidée par un
 *   autre compte, `&envoi=motif` un refus du motif par la base (donnée personnelle).
 * Enregistrée seulement en développement.
 */
export function ApercuValidation() {
  const [parametres] = useSearchParams()
  const profil = parametres.get('profil') ?? 'admin_plateforme'
  const vue = parametres.get('vue') ?? 'liste'
  const envoi = parametres.get('envoi')
  const [restantes, setRestantes] = useState<readonly string[]>(
    vue === 'vide' ? [] : DEMANDES_EXEMPLE.map((demande) => demande.demande_id),
  )
  const [decisions, setDecisions] = useState<readonly DecisionRecente[]>(DECISIONS_EXEMPLE)
  /** Identifiants des demandes et des décisions dont EJP Tech a masqué le texte. */
  const [masquees, setMasquees] = useState<readonly string[]>([])
  const occupe = useRef(false)

  const lignes = useMemo((): EtatBloc<LigneAValider[]> => {
    if (vue === 'chargement') return { etat: 'chargement' }
    if (vue === 'probleme') return { etat: 'erreur', reessayer }
    if (profil === 'admin_eglise') {
      return {
        etat: 'donnees',
        donnees: construireLignesAdministration(
          ATTENTES_EXEMPLE.filter((attente) =>
            restantes.includes(
              DEMANDES_EXEMPLE.find((demande) => demande.indicateur_id === attente.indicateur_id)
                ?.demande_id ?? '',
            ),
          ),
        ),
      }
    }
    return {
      etat: 'donnees',
      donnees: construireLignesEjpTech(
        DEMANDES_EXEMPLE.filter((demande) => restantes.includes(demande.demande_id)).map(
          (demande) =>
            masquees.includes(demande.demande_id)
              ? { ...demande, pourquoi: TEXTE_MASQUE }
              : demande,
        ),
      ),
    }
  }, [profil, vue, restantes, masquees])

  const decidees = useMemo((): EtatBloc<LigneDecidee[]> => {
    if (vue === 'decisions-probleme') return { etat: 'erreur', reessayer }
    return {
      etat: 'donnees',
      donnees: construireDecidees(
        decisions.map((decision) =>
          masquees.includes(decision.validation_id) && decision.motif !== null
            ? { ...decision, motif: TEXTE_MASQUE }
            : decision,
        ),
      ),
    }
  }, [vue, decisions, masquees])

  const retraits = useMemo((): EtatBloc<LigneRetraitMinistere[]> => {
    if (vue === 'retraits-probleme') return { etat: 'erreur', reessayer }
    return {
      etat: 'donnees',
      donnees: construireRetraitsMinisteres(
        RETRAITS_EXEMPLE.map((retrait) => ({
          ...retrait,
          motif: masquees.includes(retrait.retrait_id) ? TEXTE_MASQUE : retrait.motif,
          // Le « Pourquoi » d'une demande retirée se masque par l'identifiant de la demande.
          demande:
            retrait.demande !== null && masquees.includes(retrait.demande.id)
              ? { ...retrait.demande, pourquoi: TEXTE_MASQUE }
              : retrait.demande,
        })),
      ),
    }
  }, [vue, masquees])

  const actions: ActionsLigne = {
    valider: (ligne) => decider(ligne, 'valide', null),
    refuser: (ligne, motif) => decider(ligne, 'refuse', motif),
    masquer: async (masquage) => {
      await new Promise((resolve) => setTimeout(resolve, ATTENTE_SIMULEE_MS))
      // L'erreur de fetch hors ligne : une autre `Error` serait lue comme un refus inattendu.
      if (envoi === 'echec') throw new TypeError('Failed to fetch')
      setMasquees((courantes) => [...courantes, masquage.cibleId])
    },
  }

  /** Décision simulée : les mêmes refus que la base, aucun appel au serveur. */
  async function decider(
    ligne: LigneAValider,
    decision: 'valide' | 'refuse',
    motif: string | null,
  ): Promise<void> {
    if (occupe.current) return
    occupe.current = true
    try {
      await new Promise((resolve) => setTimeout(resolve, ATTENTE_SIMULEE_MS))
      if (envoi === 'echec') throw new TypeError('Failed to fetch')
      if (envoi === 'motif' && decision === 'refuse') {
        throw erreurBase('P0001', MOTIF_REFUSE_EXEMPLE)
      }
      setRestantes((courantes) => courantes.filter((id) => id !== ligne.id))
      if (envoi === 'decidee') {
        throw erreurBase('P0001', MESSAGES_BASE_VALIDATION.dejaDecidee)
      }
      setDecisions((courantes) => [
        {
          validation_id: `00000000-0000-4000-8000-${String(courantes.length + 100).padStart(12, '0')}`,
          ministere_nom: ligne.ministere,
          libelle: ligne.libelle,
          decision,
          motif,
          saisi_le: '2026-10-10T12:00:00+02:00',
        },
        ...courantes,
      ])
    } finally {
      occupe.current = false
    }
  }

  if (profil !== 'admin_plateforme' && profil !== 'admin_eglise') return <PageNonDisponible />
  const decide = profil === 'admin_plateforme'

  return (
    <section className="flex flex-col">
      <h1 className="font-lecture text-titre leading-tight font-medium">Indicateurs</h1>
      <div className="mt-2 border-t-2 border-encre" />
      <VueAValider
        decide={decide}
        lignes={lignes}
        decidees={decide ? decidees : null}
        retraits={decide ? retraits : null}
        actions={decide ? actions : null}
      />
    </section>
  )
}
