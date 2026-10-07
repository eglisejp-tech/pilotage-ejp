import type { LigneVosSaisies } from '@/features/accueil-ministere/types'
import { adresseSaisieDimanche, adresseSaisieMois } from '@/features/saisie-chiffres/choixPeriode'
import { indicateursDuMois } from '@/features/saisie-chiffres/champs'
import type { IndicateurDeSaisie, MesureDeSaisie } from '@/features/saisie-chiffres/champs'
import { formaterJourCourt } from '@/lib/metier/dates'
import type { DateIso } from '@/lib/metier/dates'
import { ajouterMois, moisDe, premierJourDuMois } from '@/lib/metier/periodes'
import { ligneChiffresDuMois } from '@/features/saisie-chiffres/textes'
import { accorder, nombre } from '@/lib/metier/texte'

/**
 * Ce que E7 lit pour les lignes des chiffres (lot E3) : `v_semaine` (`lireSemaine`,
 * `src/data/eglise.ts`), les indicateurs à saisir (`lireIndicateursASaisir`, `src/data/saisies.ts`)
 * et les saisies du ministère par rythme (`lireMesuresPeriode`, `src/data/indicateurs.ts`, nature
 * « dimanche » puis « mois »).
 */
export interface DonneesLignesChiffres {
  /** `v_semaine` : jour de Paris et dimanche de référence. */
  semaine: { aujourdhui: DateIso; dimanche: DateIso }
  /** Communs et indicateurs du ministère, actifs ou à valider, sans les calculs. */
  indicateurs: readonly IndicateurDeSaisie[]
  /** `v_mesure_periode` du ministère, nature « dimanche ». */
  mesuresDimanche: readonly MesureDeSaisie[]
  /** `v_mesure_periode` du ministère, nature « mois ». */
  mesuresMois: readonly MesureDeSaisie[]
}

/**
 * Lignes de « Vos saisies » pour les chiffres (maquette 07 ; BRIEF, section 9), dans cet ordre :
 *
 * - « Chiffres du dimanche 27 sept. » : Fait si les STARs au service sont saisis pour le dimanche
 *   de référence (« Fait, 10 au service », « Corriger »), sinon « Saisir ». Le dimanche de
 *   référence bascule le dimanche à 12 h (heure de Paris, `v_semaine`) : la ligne redevient
 *   « À faire » à ce moment.
 * - « Chiffres de septembre », les chiffres du mois écoulé, seulement si le ministère a des
 *   indicateurs du mois : « À faire » du 1er du mois jusqu'à la dernière valeur du mois écoulé
 *   (« À faire, 3 sur 5 saisis »), puis Fait (« Fait, 5 chiffres », « Corriger »).
 *
 * Jamais un 0 pour une absence : une ligne sans saisie n'a pas de détail.
 */
export function lignesChiffres({
  semaine,
  indicateurs,
  mesuresDimanche,
  mesuresMois,
}: DonneesLignesChiffres): readonly LigneVosSaisies[] {
  const lignes: LigneVosSaisies[] = []
  const libelleDimanche = `Chiffres du dimanche ${formaterJourCourt(semaine.dimanche)}`
  const service = indicateurs.find(
    (indicateur) => indicateur.ministere_id === null && indicateur.code === 'service',
  )
  const saisieService = service
    ? mesuresDimanche.find(
        (mesure) =>
          mesure.indicateur_id === service.id &&
          mesure.periode === semaine.dimanche &&
          mesure.valeur !== null,
      )
    : undefined
  lignes.push(
    saisieService && saisieService.valeur !== null
      ? {
          cle: 'dimanche',
          libelle: libelleDimanche,
          etat: 'fait',
          detail: `Fait, ${nombre(saisieService.valeur)} au service`,
          action: { libelle: 'Corriger', vers: adresseSaisieDimanche(semaine.dimanche) },
        }
      : {
          cle: 'dimanche',
          libelle: libelleDimanche,
          etat: 'a_faire',
          detail: null,
          action: { libelle: 'Saisir', vers: adresseSaisieDimanche() },
        },
  )

  const duMois = indicateursDuMois(indicateurs)
  if (duMois.length === 0) return lignes
  const moisEcoule = ajouterMois(moisDe(semaine.aujourdhui), -1)
  const periode = premierJourDuMois(moisEcoule)
  const ids = new Set(duMois.map((indicateur) => indicateur.id))
  const saisis = new Set(
    mesuresMois
      .filter(
        (mesure) =>
          mesure.periode === periode && mesure.valeur !== null && ids.has(mesure.indicateur_id),
      )
      .map((mesure) => mesure.indicateur_id),
  ).size
  const attendus = ids.size
  const vers = adresseSaisieMois(moisEcoule)
  lignes.push(
    saisis === attendus
      ? {
          cle: 'mois',
          libelle: ligneChiffresDuMois(moisEcoule),
          etat: 'fait',
          detail: `Fait, ${nombre(attendus)} ${accorder(attendus, 'chiffre', 'chiffres')}`,
          action: { libelle: 'Corriger', vers },
        }
      : {
          cle: 'mois',
          libelle: ligneChiffresDuMois(moisEcoule),
          etat: 'a_faire',
          detail: saisis === 0 ? null : `À faire, ${nombre(saisis)} sur ${nombre(attendus)} saisis`,
          action: { libelle: 'Saisir', vers },
        },
  )
  return lignes
}
