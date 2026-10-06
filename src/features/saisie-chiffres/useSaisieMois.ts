import { useQuery } from '@tanstack/react-query'
import { lireSemaine } from '@/data/eglise'
import { lireCategoriesSensibles, lireMesuresPeriode } from '@/data/indicateurs'
import {
  enregistrerChiffresMois,
  lireIndicateursASaisir,
  lirePrecisions,
  lireRepartitions,
  lireTotauxDuMois,
} from '@/data/saisies'
import { enEchec } from '@/features/evenements/lectures'
import { useApresEcriture } from '@/features/evenements/useApresEcriture'
import {
  champsMois,
  detailsDesTotaux,
  indicateursDuMois,
  moisComplets,
  totauxQuiFontFoi,
} from '@/features/saisie-chiffres/champs'
import type { ChampChiffre } from '@/features/saisie-chiffres/champs'
import { choisirMois, moisAProposer, moisARattraper } from '@/features/saisie-chiffres/choixPeriode'
import type { MoisAChoisir } from '@/features/saisie-chiffres/choixPeriode'
import type { LigneMois } from '@/features/saisie-chiffres/schemas'
import { RACINE_SAISIE_CHIFFRES } from '@/features/saisie-chiffres/useSaisieDimanche'
import type { Mois } from '@/lib/metier/periodes'

export type EtatSaisieMois =
  | { etat: 'chargement' }
  | { etat: 'erreur'; reessayer: () => void }
  /** Le ministère n'a aucun indicateur du mois à saisir. */
  | { etat: 'sans_indicateur' }
  /** Le mois de l'adresse ne se saisit pas : le message du schéma et le mois proposé. */
  | { etat: 'refuse'; message: string; moisPropose: Mois }
  | {
      etat: 'pret'
      mois: Mois
      enCours: boolean
      champs: ChampChiffre[]
      proposes: MoisAChoisir[]
      rattrapage: MoisAChoisir[]
      enregistrer: (lignes: LigneMois[]) => Promise<void>
    }

/**
 * Lectures de « Chiffres du mois » : la semaine de Paris (`v_semaine`), les indicateurs, les
 * saisies du mois du ministère et les catégories des sensibles ; puis, pour le mois choisi, le
 * total le plus récent de chaque sensible, avec sa répartition et sa précision (lignes brutes du
 * ministère), pour les reprendre dans le formulaire. Un envoi relit toutes les lectures.
 */
export function useSaisieMois(ministereId: string, parametreMois: string | null): EtatSaisieMois {
  const apres = useApresEcriture()
  const semaine = useQuery({ queryKey: ['eglise', 'semaine'], queryFn: lireSemaine })
  const indicateurs = useQuery({
    queryKey: [RACINE_SAISIE_CHIFFRES, 'indicateurs', ministereId],
    queryFn: () => lireIndicateursASaisir(ministereId),
  })
  const mesures = useQuery({
    queryKey: [RACINE_SAISIE_CHIFFRES, 'mesures', ministereId, 'mois'],
    queryFn: () => lireMesuresPeriode(ministereId, 'mois'),
  })
  const categories = useQuery({
    queryKey: [RACINE_SAISIE_CHIFFRES, 'categories'],
    queryFn: lireCategoriesSensibles,
  })

  const duMois = indicateurs.data ? indicateursDuMois(indicateurs.data) : []
  const choix =
    semaine.data && indicateurs.data && mesures.data
      ? choisirMois(
          parametreMois,
          semaine.data.aujourdhui,
          moisComplets(indicateurs.data, mesures.data),
        )
      : null
  const mois = choix?.etat === 'ok' ? choix.mois : null
  const sensibles = duMois
    .filter((indicateur) => indicateur.sensible)
    .map((indicateur) => indicateur.id)
  const totaux = useQuery({
    queryKey: [RACINE_SAISIE_CHIFFRES, 'totaux', ministereId, mois, sensibles],
    queryFn: () => (mois === null ? [] : lireTotauxDuMois(ministereId, mois, sensibles)),
    enabled: mois !== null,
  })
  const ids = totaux.data ? totauxQuiFontFoi(totaux.data) : []
  const repartitions = useQuery({
    queryKey: [RACINE_SAISIE_CHIFFRES, 'repartitions', ids],
    queryFn: () => lireRepartitions(ids),
    enabled: totaux.isSuccess,
  })
  const precisions = useQuery({
    queryKey: [RACINE_SAISIE_CHIFFRES, 'precisions', ids],
    queryFn: () => lirePrecisions(ids),
    enabled: totaux.isSuccess,
  })

  const enregistrer = async (lignes: LigneMois[]) => {
    if (mois === null) return
    await enregistrerChiffresMois({ mois, lignes })
    apres()
  }

  const lectures = [semaine, indicateurs, mesures, categories, totaux, repartitions, precisions]
  if (enEchec(lectures)) {
    return {
      etat: 'erreur',
      reessayer: () => {
        for (const lecture of lectures) if (lecture.isError) void lecture.refetch()
      },
    }
  }
  if (lectures.some((lecture) => lecture.isError)) return { etat: 'chargement' }
  if (semaine.isSuccess && semaine.data === null) {
    return { etat: 'erreur', reessayer: () => void semaine.refetch() }
  }
  if (indicateurs.isSuccess && duMois.length === 0) return { etat: 'sans_indicateur' }
  if (choix?.etat === 'refuse') {
    return { etat: 'refuse', message: choix.message, moisPropose: choix.moisPropose }
  }
  if (
    !semaine.data ||
    !indicateurs.data ||
    !mesures.data ||
    !categories.data ||
    !totaux.data ||
    !repartitions.data ||
    !precisions.data ||
    choix === null
  ) {
    return { etat: 'chargement' }
  }
  const complets = moisComplets(indicateurs.data, mesures.data)
  return {
    etat: 'pret',
    mois: choix.mois,
    enCours: choix.enCours,
    champs: champsMois({
      mois: choix.mois,
      indicateurs: indicateurs.data,
      mesuresMois: mesures.data,
      categories: categories.data,
      details: detailsDesTotaux(totaux.data, repartitions.data, precisions.data),
    }),
    proposes: moisAProposer(semaine.data.aujourdhui, complets),
    rattrapage: moisARattraper(semaine.data.aujourdhui, complets),
    enregistrer,
  }
}
