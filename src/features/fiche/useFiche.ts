import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import {
  lireIndicateursCommuns,
  lireSemaine,
  lireTotauxACeJour,
  lireTotauxDimanche,
} from '@/data/eglise'
import {
  lireDernieresSaisies,
  lireLigneTableauMinistere,
  lireMesuresCommunsMinistere,
  lireMinistereFiche,
  lirePointsMinistere,
  lirePrecisionsMinistere,
  lireRepartitionsMinistere,
  lireSensiblesMinistere,
} from '@/data/fiche'
import {
  lireCalculs,
  lireCategoriesSensibles,
  lireCommunsFiche,
  lireSeries,
  lireSuiviIndicateurs,
} from '@/data/indicateurs'
import { lireMinisteres } from '@/data/ministeres'
import { construireFiche, construirePointsFiche } from '@/features/fiche/construireFiche'
import type { LecteurFiche } from '@/features/fiche/construireFiche'
import { construireDernieresSaisies } from '@/features/fiche/construireDernieresSaisies'
import type {
  DerniereSaisieFiche,
  DonneesFiche,
  EtatBloc,
  PointFiche,
} from '@/features/fiche/modeleFiche'

/** Sans réponse au bout de ce délai, la fiche affiche son erreur (LISEZMOI, « États »). */
export const DELAI_MAX_CHARGEMENT = 10_000

/** Comme `schemaIdentifiantSession` : la forme d'un uuid, que la base vérifie ensuite. */
const schemaIdentifiantMinistere = z.guid()

/** Un identifiant de ministère bien formé ? Sinon la fiche est introuvable, sans requête. */
export function estIdentifiantMinistere(id: string | undefined): id is string {
  return id !== undefined && schemaIdentifiantMinistere.safeParse(id).success
}

export type ResultatFiche =
  | { etat: 'chargement' }
  | { etat: 'erreur'; reessayer: () => void }
  /** Identifiant inconnu, ou ministère désactivé : « Ce ministère n'existe pas ou n'est plus actif. » */
  | { etat: 'introuvable' }
  | {
      etat: 'pret'
      donnees: DonneesFiche
      /** Lu à part : son problème passager garde le titre et propose « Réessayer ». */
      points: EtatBloc<PointFiche[]>
      dernieresSaisies: EtatBloc<DerniereSaisieFiche[]>
      /**
       * Précisions, répartitions ou catégories des sensibles en échec : la fiche s'affiche sans ces
       * détails et le bloc des chiffres propose « Réessayer ». Null : tout est lu.
       */
      reessayerDetailsSensibles: (() => void) | null
    }

/**
 * Lit la fiche d'un ministère (une requête par fonction de `src/data/`) et la construit. Les
 * répartitions, les précisions et les catégories ne se lisent que si le ministère a un indicateur
 * sensible ; les courbes, une fois connus ses indicateurs. Trois lectures sont à part, et leur
 * échec ne cache pas la fiche : « Dernières saisies » et les points (chacun son « Réessayer »), et
 * le détail des sensibles (catégories, répartitions, précisions : un « Réessayer » sous les
 * chiffres). Toute autre lecture en échec, ou 10 s sans réponse, donne l'erreur de page avec
 * « Réessayer ».
 */
export function useFiche(ministereId: string, lecteur: LecteurFiche): ResultatFiche {
  const cle = ['fiche', ministereId] as const
  const semaine = useQuery({ queryKey: ['eglise', 'semaine'], queryFn: lireSemaine })
  const ministere = useQuery({
    queryKey: [...cle, 'ministere'],
    queryFn: () => lireMinistereFiche(ministereId),
  })
  const tableau = useQuery({
    queryKey: [...cle, 'tableau'],
    queryFn: () => lireLigneTableauMinistere(ministereId),
  })
  const communs = useQuery({ queryKey: ['eglise', 'indicateurs'], queryFn: lireIndicateursCommuns })
  const idsCommuns = (communs.data ?? []).map((commun) => commun.id)
  const mesuresCommuns = useQuery({
    queryKey: [...cle, 'mesures-communs', ...idsCommuns],
    queryFn: () => lireMesuresCommunsMinistere(ministereId, idsCommuns),
    enabled: communs.isSuccess,
  })
  const libellesCommuns = useQuery({
    queryKey: [...cle, 'libelles-communs'],
    queryFn: () => lireCommunsFiche(ministereId),
  })
  const totauxDimanche = useQuery({
    queryKey: ['eglise', 'totaux-dimanche'],
    queryFn: lireTotauxDimanche,
  })
  const totauxACeJour = useQuery({ queryKey: ['eglise', 'a-ce-jour'], queryFn: lireTotauxACeJour })
  const suivi = useQuery({
    queryKey: [...cle, 'suivi'],
    queryFn: () => lireSuiviIndicateurs(ministereId),
  })
  const idsSeries = (suivi.data ?? [])
    .filter(
      (ligne) =>
        ligne.ministere_id === ministereId && ligne.calcul === null && ligne.nature !== 'a_ce_jour',
    )
    .map((ligne) => ligne.indicateur_id)
  const series = useQuery({
    queryKey: [...cle, 'series', ...idsSeries],
    queryFn: () => lireSeries(idsSeries),
    enabled: suivi.isSuccess,
  })
  const calculs = useQuery({
    queryKey: [...cle, 'calculs'],
    queryFn: () => lireCalculs(ministereId),
  })
  const sensibles = useQuery({
    queryKey: [...cle, 'sensibles'],
    queryFn: () => lireSensiblesMinistere(ministereId),
  })
  const avecSensibles = (sensibles.data?.length ?? 0) > 0
  const categories = useQuery({
    queryKey: ['indicateurs', 'categories'],
    queryFn: lireCategoriesSensibles,
    enabled: avecSensibles,
  })
  const repartitions = useQuery({
    queryKey: [...cle, 'repartitions'],
    queryFn: () => lireRepartitionsMinistere(ministereId),
    enabled: avecSensibles,
  })
  const precisions = useQuery({
    queryKey: [...cle, 'precisions'],
    queryFn: () => lirePrecisionsMinistere(ministereId),
    enabled: avecSensibles,
  })
  const points = useQuery({
    queryKey: [...cle, 'points'],
    queryFn: () => lirePointsMinistere(ministereId),
  })
  const ministeres = useQuery({ queryKey: ['ministeres', 'liste'], queryFn: lireMinisteres })
  const dernieres = useQuery({
    queryKey: [...cle, 'dernieres-saisies'],
    queryFn: () => lireDernieresSaisies(ministereId),
  })

  const necessaires: UseQueryResult[] = [
    semaine,
    ministere,
    tableau,
    communs,
    mesuresCommuns,
    libellesCommuns,
    totauxDimanche,
    totauxACeJour,
    suivi,
    series,
    calculs,
    sensibles,
    ministeres,
  ]
  // Lectures à part : la fiche attend leur réponse (la phrase compte les points), mais un échec
  // ne la remplace pas par l'erreur de page.
  const detailsSensibles: UseQueryResult[] = avecSensibles
    ? [categories, repartitions, precisions]
    : []
  const aPart: UseQueryResult[] = [points, ...detailsSensibles]
  const repondue = (requete: UseQueryResult) => requete.isSuccess || requete.isError

  const pret = necessaires.every((requete) => requete.isSuccess) && aPart.every(repondue)
  const [depasse, setDepasse] = useState(false)
  useEffect(() => {
    if (pret) return
    const minuterie = setTimeout(() => setDepasse(true), DELAI_MAX_CHARGEMENT)
    return () => clearTimeout(minuterie)
  }, [pret])

  const reessayer = () => {
    setDepasse(false)
    for (const requete of [...necessaires, ...aPart]) {
      if (requete.isError || !requete.isSuccess) void requete.refetch()
    }
  }
  const reessayerDetails = () => {
    for (const requete of detailsSensibles) {
      if (requete.isError) void requete.refetch()
    }
  }

  if (ministere.isSuccess && (ministere.data === null || ministere.data.desactive_le !== null)) {
    return { etat: 'introuvable' }
  }
  const enEchec =
    necessaires.some((requete) => requete.isError) || (semaine.isSuccess && semaine.data === null)
  if (enEchec || (depasse && !pret)) return { etat: 'erreur', reessayer }
  if (!pret || semaine.data == null || ministere.data == null) return { etat: 'chargement' }

  const lectures = {
    semaine: semaine.data,
    ministere: ministere.data,
    derniereSaisie: tableau.data?.derniere_saisie ?? null,
    communs: communs.data ?? [],
    libellesCommuns: libellesCommuns.data ?? [],
    mesuresCommuns: mesuresCommuns.data ?? [],
    totauxDimanche: totauxDimanche.data ?? [],
    totauxACeJour: totauxACeJour.data ?? [],
    suivi: suivi.data ?? [],
    calculs: calculs.data ?? [],
    series: series.data ?? [],
    sensibles: sensibles.data ?? [],
    categories: categories.data ?? [],
    repartitions: repartitions.data ?? [],
    precisions: precisions.data ?? [],
    points: points.data ?? { points: [], mentions: [] },
    ministeres: ministeres.data ?? [],
  }
  const dernieresSaisies: EtatBloc<DerniereSaisieFiche[]> = dernieres.isError
    ? { etat: 'erreur', reessayer: () => void dernieres.refetch() }
    : dernieres.isSuccess
      ? { etat: 'donnees', donnees: construireDernieresSaisies(dernieres.data, lectures.communs) }
      : { etat: 'chargement' }
  const pointsBloc: EtatBloc<PointFiche[]> = points.isError
    ? { etat: 'erreur', reessayer: () => void points.refetch() }
    : { etat: 'donnees', donnees: construirePointsFiche(lectures, lecteur) }
  return {
    etat: 'pret',
    donnees: construireFiche(lectures, lecteur),
    points: pointsBloc,
    dernieresSaisies,
    reessayerDetailsSensibles: detailsSensibles.some((requete) => requete.isError)
      ? reessayerDetails
      : null,
  }
}
