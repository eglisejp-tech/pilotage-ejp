import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { lireIndicateursCommuns, lireSemaine } from '@/data/eglise'
import { lireComptesJournal, lireJournal } from '@/data/journal'
import { lireMinisteres } from '@/data/ministeres'
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
import { useLimiteJournal } from '@/features/journal/useLimiteJournal'
import type { TypeCompte } from '@/lib/base'

/** Clés des lectures de l'écran : « Réessayer » ne relance que celles-ci. */
const RACINES_CLES = ['eglise', 'ministeres', 'journal']

export type ResultatJournal =
  | { etat: 'chargement' }
  /** Une lecture a échoué : bandeau « La connexion a échoué. Réessayez. » (10 s sans réponse aussi). */
  | { etat: 'erreur'; reessayer: () => void }
  | { etat: 'pret'; donnees: DonneesJournal; afficherPlus: () => void }

/**
 * Lit l'écran 06 : le jour de Paris (`v_semaine`), les comptes du filtre (pas pour un ministère),
 * les ministères et les chiffres communs qui nomment les lignes, puis les lignes de `v_journal`
 * avec les filtres retenus. Le début de la période se calcule sur le jour de Paris de la base,
 * jamais sur la date du navigateur. Pendant qu'un filtre relit, les lignes d'avant restent à
 * l'écran (`enMiseAJour`) : la page ne se vide pas à chaque choix.
 */
export function useJournal(profil: TypeCompte, brut: FiltresJournal): ResultatJournal {
  const queryClient = useQueryClient()
  const avecComptes = profil !== 'ministere'
  const semaine = useQuery({ queryKey: ['eglise', 'semaine'], queryFn: lireSemaine })
  const communs = useQuery({ queryKey: ['eglise', 'indicateurs'], queryFn: lireIndicateursCommuns })
  const ministeres = useQuery({ queryKey: ['ministeres', 'liste'], queryFn: lireMinisteres })
  const comptes = useQuery({
    queryKey: ['journal', 'comptes'],
    queryFn: lireComptesJournal,
    enabled: avecComptes,
  })

  const choix = useMemo<ChoixPossibles>(
    () => ({
      profil,
      comptes: avecComptes ? optionsComptes(comptes.data ?? []) : null,
      actions: optionsActions(profil),
      ministeres: (ministeres.data ?? []).map(optionMinistere),
    }),
    [profil, avecComptes, comptes.data, ministeres.data],
  )
  const filtres = useMemo(
    () => filtresRetenus(brut, choix),
    // `brut` change d'identité à chaque lecture de l'adresse : seuls ses champs comptent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [brut.compte, brut.action, brut.periode, brut.ministere, choix],
  )
  const { limite, afficherPlus } = useLimiteJournal(filtres)

  const aujourdhui = semaine.data?.aujourdhui ?? null
  const listesPretes =
    aujourdhui !== null &&
    communs.isSuccess &&
    ministeres.isSuccess &&
    (!avecComptes || comptes.isSuccess)
  const page = useQuery({
    queryKey: ['journal', 'lignes', filtres, limite, aujourdhui],
    queryFn: () => {
      if (aujourdhui === null) throw new Error('Le jour de Paris est inconnu.')
      return lireJournal({
        compte: filtres.compte,
        action: filtres.action,
        ministere: filtres.ministere,
        depuis: debutDePeriode(filtres.periode, aujourdhui),
        limite,
      })
    },
    enabled: listesPretes,
    placeholderData: keepPreviousData,
  })

  const lectures = [semaine, communs, ministeres, page, ...(avecComptes ? [comptes] : [])]
  const enEchec =
    lectures.some((requete) => requete.isError) || (semaine.isSuccess && semaine.data === null)

  const donnees = useMemo<DonneesJournal | null>(() => {
    if (!listesPretes || !communs.data || !ministeres.data || !page.data) return null
    const contexte = contexteJournal(communs.data, ministeres.data, page.data.sessions)
    return {
      filtres,
      comptes: choix.comptes,
      actions: choix.actions,
      ministereChoisi: choix.ministeres.find((option) => option.id === filtres.ministere) ?? null,
      lignes: construireJournal(page.data.lignes, contexte),
      aPlus: page.data.aPlus,
      enMiseAJour: page.isPlaceholderData,
    }
  }, [
    listesPretes,
    communs.data,
    ministeres.data,
    page.data,
    page.isPlaceholderData,
    filtres,
    choix,
  ])

  const reessayer = () => {
    // Une lecture sans réponse reste en cours : un simple refetch la rendrait telle quelle.
    // resetQueries l'annule et la relance ; les lectures réussies gardent leurs données.
    void queryClient.resetQueries({
      predicate: (requete) =>
        RACINES_CLES.includes(String(requete.queryKey[0])) &&
        (requete.state.status !== 'success' || requete.state.data === null),
    })
  }

  if (enEchec) return { etat: 'erreur', reessayer }
  if (donnees !== null) return { etat: 'pret', donnees, afficherPlus }
  return { etat: 'chargement' }
}
