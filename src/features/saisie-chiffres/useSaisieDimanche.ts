import { useQuery } from '@tanstack/react-query'
import { lireSemaine } from '@/data/eglise'
import { lireMesuresPeriode } from '@/data/indicateurs'
import { enregistrerChiffresDimanche, lireIndicateursASaisir } from '@/data/saisies'
import { enEchec } from '@/features/evenements/lectures'
import { useApresEcriture } from '@/features/evenements/useApresEcriture'
import {
  aIndicateurDuMatin,
  champsDimanche,
  dimanchesSaisis,
} from '@/features/saisie-chiffres/champs'
import type { ChampsDimanche } from '@/features/saisie-chiffres/champs'
import { choisirDimanche, dimanchesProposes } from '@/features/saisie-chiffres/choixPeriode'
import type { DimanchePropose } from '@/features/saisie-chiffres/choixPeriode'
import type { SaisieDimanche } from '@/features/saisie-chiffres/schemas'
import type { DateIso } from '@/lib/metier/dates'

/** Premier élément des clés de requête des saisies des chiffres. */
export const RACINE_SAISIE_CHIFFRES = 'saisie-chiffres'

export type EtatSaisieDimanche =
  | { etat: 'chargement' }
  | { etat: 'erreur'; reessayer: () => void }
  /** La date de l'adresse n'est pas un dimanche passé ou du jour : le dimanche de référence. */
  | { etat: 'refuse'; dimancheReference: DateIso }
  | {
      etat: 'pret'
      dimanche: DateIso
      /** Dimanche de référence (`v_semaine`) : celui que propose un état vide. */
      dimancheReference: DateIso
      matin: boolean
      champs: ChampsDimanche
      proposes: DimanchePropose[]
      enregistrer: (lignes: SaisieDimanche['lignes']) => Promise<void>
    }

/**
 * Lectures de la saisie du dimanche : la semaine de Paris (`v_semaine`), les indicateurs à saisir,
 * puis les saisies du ministère (dimanches et « à ce jour »). Le dimanche vient de l'adresse
 * (`?date=`) ou du dimanche de référence. Un envoi relit toutes les lectures.
 */
export function useSaisieDimanche(
  ministereId: string,
  parametreDate: string | null,
): EtatSaisieDimanche {
  const apres = useApresEcriture()
  const semaine = useQuery({ queryKey: ['eglise', 'semaine'], queryFn: lireSemaine })
  const indicateurs = useQuery({
    queryKey: [RACINE_SAISIE_CHIFFRES, 'indicateurs', ministereId],
    queryFn: () => lireIndicateursASaisir(ministereId),
  })
  const dimanches = useQuery({
    queryKey: [RACINE_SAISIE_CHIFFRES, 'mesures', ministereId, 'dimanche'],
    queryFn: () => lireMesuresPeriode(ministereId, 'dimanche'),
  })
  const aCeJour = useQuery({
    queryKey: [RACINE_SAISIE_CHIFFRES, 'mesures', ministereId, 'a_ce_jour'],
    queryFn: () => lireMesuresPeriode(ministereId, 'a_ce_jour'),
  })

  const choix = semaine.data ? choisirDimanche(parametreDate, semaine.data) : null
  const dimanche = choix?.etat === 'ok' ? choix.dimanche : null
  const enregistrer = async (lignes: SaisieDimanche['lignes']) => {
    if (dimanche === null) return
    await enregistrerChiffresDimanche({ ministereId, dimanche, lignes })
    apres()
  }

  const lectures = [semaine, indicateurs, dimanches, aCeJour]
  if (enEchec(lectures)) {
    return {
      etat: 'erreur',
      reessayer: () => {
        for (const lecture of lectures) if (lecture.isError) void lecture.refetch()
      },
    }
  }
  // Un nouvel essai est en cours : le panneau repasse par le chargement.
  if (lectures.some((lecture) => lecture.isError)) return { etat: 'chargement' }
  // `v_semaine` rend toujours une ligne : sans elle, rien ne se date (problème passager).
  if (semaine.isSuccess && semaine.data === null) {
    return { etat: 'erreur', reessayer: () => void semaine.refetch() }
  }
  if (!semaine.data || !indicateurs.data || !dimanches.data || !aCeJour.data || choix === null) {
    return { etat: 'chargement' }
  }
  if (choix.etat === 'refuse') {
    return { etat: 'refuse', dimancheReference: semaine.data.dimanche }
  }
  return {
    etat: 'pret',
    dimanche: choix.dimanche,
    dimancheReference: semaine.data.dimanche,
    matin: choix.matin,
    champs: champsDimanche({
      dimanche: choix.dimanche,
      matin: choix.matin,
      indicateurs: indicateurs.data,
      mesuresDimanche: dimanches.data,
      mesuresACeJour: aCeJour.data,
    }),
    proposes: dimanchesProposes(
      semaine.data,
      dimanchesSaisis(indicateurs.data, dimanches.data),
      aIndicateurDuMatin(indicateurs.data),
    ),
    enregistrer,
  }
}
