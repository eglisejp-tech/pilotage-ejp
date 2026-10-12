import { keepPreviousData, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { lireIndicateursCommuns, lireSemaine } from '@/data/eglise'
import { lireComptesJournal, lireJournal, TAILLE_PAGE_JOURNAL } from '@/data/journal'
import type { CurseurJournal, SessionJournal } from '@/data/journal'
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
import type { TypeCompte } from '@/lib/base'

/** Clés des lectures de l'écran : « Réessayer » ne relance que celles-ci. */
const RACINES_CLES = ['eglise', 'ministeres', 'journal']

export type ResultatJournal =
  | { etat: 'chargement' }
  /** Une lecture a échoué : bandeau « La connexion a échoué. Réessayez. » (10 s sans réponse aussi). */
  | { etat: 'erreur'; reessayer: () => void }
  | {
      etat: 'pret'
      donnees: DonneesJournal
      afficherPlus: () => void
      /**
       * Relance la lecture qui a échoué alors que des lignes sont déjà à l'écran (page suivante,
       * ou relecture des lignes) ; null quand tout va bien. La vue garde alors ses lignes.
       */
      reessayerPlus: (() => void) | null
    }

/** Les sessions de toutes les pages lues, une fois chacune. */
function sessionsDesPages(pages: readonly { sessions: SessionJournal[] }[]): SessionJournal[] {
  return [...new Map(pages.flatMap((p) => p.sessions).map((s) => [s.id, s] as const)).values()]
}

/**
 * Lit l'écran 06 : le jour de Paris (`v_semaine`), les comptes du filtre (pas pour un ministère),
 * les ministères et les chiffres communs qui nomment les lignes, puis les lignes de `v_journal`
 * avec les filtres retenus. Le début de la période se calcule sur le jour de Paris de la base,
 * jamais sur la date du navigateur. Les lignes se lisent page par page (50 lignes, puis les 50
 * plus anciennes que la dernière lue) : une réponse de la base ne dépasse jamais 51 lignes, même
 * pour « Depuis le début » sur un journal de plusieurs milliers de lignes. Pendant qu'un filtre
 * relit, les lignes d'avant restent à l'écran (`enMiseAJour`) : la page ne se vide pas à chaque
 * choix. Si une page ou une relecture échoue alors que des lignes sont affichées, elles restent
 * avec leurs filtres et `reessayerPlus` relance la lecture qui a échoué.
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

  const aujourdhui = semaine.data?.aujourdhui ?? null
  const listesPretes =
    aujourdhui !== null &&
    communs.isSuccess &&
    ministeres.isSuccess &&
    (!avecComptes || comptes.isSuccess)
  const page = useInfiniteQuery({
    queryKey: ['journal', 'lignes', filtres, aujourdhui],
    queryFn: ({ pageParam }) => {
      if (aujourdhui === null) throw new Error('Le jour de Paris est inconnu.')
      return lireJournal({
        compte: filtres.compte,
        action: filtres.action,
        ministere: filtres.ministere,
        depuis: debutDePeriode(filtres.periode, aujourdhui),
        apres: pageParam,
        limite: TAILLE_PAGE_JOURNAL,
      })
    },
    initialPageParam: null as CurseurJournal | null,
    getNextPageParam: (derniere) => derniere.suivant ?? undefined,
    enabled: listesPretes,
    placeholderData: keepPreviousData,
  })

  // Une page suivante qui échoue garde les lignes déjà lues : on retient laquelle a échoué.
  const [suiteEnEchec, setSuiteEnEchec] = useState(false)
  const afficherPlus = () => {
    setSuiteEnEchec(false)
    void page.fetchNextPage().then((suite) => setSuiteEnEchec(suite.isError))
  }

  // Une lecture des lignes en échec alors que des lignes sont déjà là n'efface pas la page.
  const echecAvecLignes = page.isError && page.data !== undefined
  const lectures = [semaine, communs, ministeres, ...(avecComptes ? [comptes] : [])]
  const enEchec =
    lectures.some((requete) => requete.isError) ||
    (semaine.isSuccess && semaine.data === null) ||
    (page.isError && !echecAvecLignes)

  const donnees = useMemo<DonneesJournal | null>(() => {
    if (!listesPretes || !communs.data || !ministeres.data || !page.data) return null
    const pages = page.data.pages
    const contexte = contexteJournal(communs.data, ministeres.data, sessionsDesPages(pages))
    // Une ligne n'est montrée qu'une fois, même si deux pages la portaient.
    const lignes = [
      ...new Map(pages.flatMap((p) => p.lignes).map((l) => [l.id, l] as const)).values(),
    ]
    return {
      filtres,
      comptes: choix.comptes,
      actions: choix.actions,
      ministereChoisi: choix.ministeres.find((option) => option.id === filtres.ministere) ?? null,
      lignes: construireJournal(lignes, contexte),
      aPlus: page.hasNextPage,
      enMiseAJour: page.isPlaceholderData || page.isFetchingNextPage,
    }
  }, [
    listesPretes,
    communs.data,
    ministeres.data,
    page.data,
    page.hasNextPage,
    page.isPlaceholderData,
    page.isFetchingNextPage,
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
  if (donnees !== null) {
    const reessayerPlus = echecAvecLignes
      ? suiteEnEchec
        ? afficherPlus
        : () => void page.refetch()
      : null
    return { etat: 'pret', donnees, afficherPlus, reessayerPlus }
  }
  return { etat: 'chargement' }
}
