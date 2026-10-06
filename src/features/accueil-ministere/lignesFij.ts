import type { LigneVosSaisies } from '@/features/accueil-ministere/types'
import { NOMBRE_DEPARTEMENTS, RUBRIQUES_FIJ } from '@/features/saisie-fij/departements'
import type { Departement } from '@/lib/base'
import { formaterJourCourt, jourDeParis, lireInstant } from '@/lib/metier/dates'
import type { DateIso } from '@/lib/metier/dates'
import { joursDepuis } from '@/lib/metier/fraicheur'
import { nombre } from '@/lib/metier/texte'

/** La carte est « Faite » si son dernier envoi a moins de 30 jours (BRIEF, section 9). */
export const CARTE_A_JOUR_JOURS = 30

/** Ce que E7 lit pour les lignes FIJ (lots E4 et B5 : `src/data/eglise.ts`, `src/data/fij.ts`). */
export interface DonneesLignesFij {
  /** Le ministère du compte est-il le ministère `fij` (`lireCodeMinistere`) ? */
  estFij: boolean
  /** `v_semaine` : jour de Paris et dimanche de référence. */
  semaine: { aujourdhui: DateIso; dimanche: DateIso }
  /** Dernière valeur de chaque département (`v_carte_fij`). */
  carte: readonly { departement: Departement; valeur: number; saisi_le: string }[]
  /** `v_fij_statistique` : complétude de chaque rubrique et de chaque dimanche. */
  statistiques: readonly { dimanche: DateIso; nb_departements: number }[]
}

const VALEURS_PAR_SEMAINE = RUBRIQUES_FIJ.length * NOMBRE_DEPARTEMENTS

/**
 * Lignes de « Vos saisies » du seul ministère `fij` (BRIEF, section 9) : « Carte des FIJ », Faite
 * si le dernier envoi a moins de 30 jours ; « Chiffres par département », Faits si la semaine de
 * référence a au moins une valeur, avec leur complétude (« 30 valeurs sur 32 »). Aucune ligne pour
 * un autre ministère.
 */
export function lignesFij({
  estFij,
  semaine,
  carte,
  statistiques,
}: DonneesLignesFij): readonly LigneVosSaisies[] {
  if (!estFij) return []

  const dernierEnvoi = carte.reduce<string | null>(
    (plusRecent, ligne) =>
      plusRecent === null ||
      lireInstant(ligne.saisi_le).getTime() > lireInstant(plusRecent).getTime()
        ? ligne.saisi_le
        : plusRecent,
    null,
  )
  const jours = joursDepuis(dernierEnvoi, semaine.aujourdhui)
  const carteFaite = jours !== null && jours < CARTE_A_JOUR_JOURS
  const totalCarte = carte.reduce((total, ligne) => total + ligne.valeur, 0)
  const ligneCarte: LigneVosSaisies = carteFaite
    ? {
        cle: 'carte_fij',
        libelle: 'Carte des FIJ',
        etat: 'fait',
        detail: `Fait, ${nombre(totalCarte)} FIJ`,
        action: { libelle: 'Corriger', vers: '/saisir/fij' },
      }
    : {
        cle: 'carte_fij',
        libelle: 'Carte des FIJ',
        etat: 'a_faire',
        detail:
          dernierEnvoi === null
            ? null
            : `À faire, dernier envoi le ${formaterJourCourt(jourDeParis(dernierEnvoi))}`,
        action: { libelle: 'Saisir', vers: '/saisir/fij' },
      }

  const valeurs = statistiques
    .filter((ligne) => ligne.dimanche === semaine.dimanche)
    .reduce((total, ligne) => total + ligne.nb_departements, 0)
  const ligneStatistiques: LigneVosSaisies =
    valeurs > 0
      ? {
          cle: 'fij_statistiques',
          libelle: 'Chiffres par département',
          etat: 'fait',
          detail: `Fait, ${nombre(valeurs)} valeurs sur ${nombre(VALEURS_PAR_SEMAINE)}`,
          action: { libelle: 'Corriger', vers: '/saisir/fij-statistiques' },
        }
      : {
          cle: 'fij_statistiques',
          libelle: 'Chiffres par département',
          etat: 'a_faire',
          detail: null,
          action: { libelle: 'Saisir', vers: '/saisir/fij-statistiques' },
        }

  return [ligneCarte, ligneStatistiques]
}
