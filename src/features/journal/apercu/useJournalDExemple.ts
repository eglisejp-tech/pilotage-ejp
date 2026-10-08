import { useMemo, useState } from 'react'
import { TAILLE_PAGE_JOURNAL } from '@/data/journal'
import {
  AUJOURDHUI_EXEMPLE,
  COMMUNS_EXEMPLE,
  COMPTES_EXEMPLE,
  lireExemple,
  MINISTERES_EXEMPLE,
  SESSIONS_EXEMPLE,
} from '@/features/journal/apercu/exemplesJournal'
import {
  filtresRetenus,
  optionMinistere,
  optionsActions,
  optionsComptes,
} from '@/features/journal/choix'
import type { ChoixPossibles } from '@/features/journal/choix'
import { construireJournal, contexteJournal } from '@/features/journal/construireJournal'
import type { FiltresJournal } from '@/features/journal/filtres'
import type { DonneesJournal } from '@/features/journal/modeleJournal'
import { debutDePeriode } from '@/features/journal/periodes'
import type { TypeCompte } from '@/lib/base'

/**
 * Nombre de lignes montrées : 50 d'abord, puis 50 de plus à chaque « Afficher 50 lignes de plus ».
 * Changer un filtre revient à 50. L'aperçu lit un tableau en mémoire : il peut relire depuis le
 * début avec une limite plus grande, ce que la vraie lecture ne fait pas (elle reprend après la
 * dernière ligne lue, `useJournal`).
 */
function useLimiteDApercu(filtres: FiltresJournal): { limite: number; afficherPlus: () => void } {
  const cle = JSON.stringify(filtres)
  const [demande, setDemande] = useState({ cle, limite: TAILLE_PAGE_JOURNAL })
  const limite = demande.cle === cle ? demande.limite : TAILLE_PAGE_JOURNAL
  return {
    limite,
    afficherPlus: () => setDemande({ cle, limite: limite + TAILLE_PAGE_JOURNAL }),
  }
}

/**
 * Ce que `useJournal` rend à la page, lu dans le journal d'exemple au lieu de la base : mêmes
 * filtres retenus, même période (jour de Paris de l'exemple), même limite de 50 lignes puis 50 de
 * plus. `vide` : un journal sans aucune ligne.
 */
export function useJournalDExemple(
  profil: TypeCompte,
  brut: FiltresJournal,
  vide: boolean,
): { donnees: DonneesJournal; afficherPlus: () => void } {
  const choix = useMemo<ChoixPossibles>(
    () => ({
      profil,
      comptes: profil === 'ministere' ? null : optionsComptes(COMPTES_EXEMPLE),
      actions: optionsActions(profil),
      ministeres: MINISTERES_EXEMPLE.map(optionMinistere),
    }),
    [profil],
  )
  const filtres = useMemo(
    () => filtresRetenus(brut, choix),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [brut.compte, brut.action, brut.periode, brut.ministere, choix],
  )
  const { limite, afficherPlus } = useLimiteDApercu(filtres)

  const donnees = useMemo<DonneesJournal>(() => {
    const lecture = vide
      ? { lignes: [], aPlus: false }
      : lireExemple(
          {
            compte: filtres.compte,
            action: filtres.action,
            ministere: filtres.ministere,
            depuis: debutDePeriode(filtres.periode, AUJOURDHUI_EXEMPLE),
            apres: null,
            limite,
          },
          profil,
        )
    const contexte = contexteJournal(COMMUNS_EXEMPLE, MINISTERES_EXEMPLE, SESSIONS_EXEMPLE)
    return {
      filtres,
      comptes: choix.comptes,
      actions: choix.actions,
      ministereChoisi: choix.ministeres.find((option) => option.id === filtres.ministere) ?? null,
      lignes: construireJournal(lecture.lignes, contexte),
      aPlus: lecture.aPlus,
      enMiseAJour: false,
    }
  }, [vide, filtres, limite, profil, choix])

  return { donnees, afficherPlus }
}
