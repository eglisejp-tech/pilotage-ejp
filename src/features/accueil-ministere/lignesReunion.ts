import type { LigneVosSaisies } from '@/features/accueil-ministere/types'
import type { LigneVue } from '@/lib/base'
import { formaterRendezVous } from '@/lib/metier/dates'

/** Ce que la ligne lit de la prochaine réunion (`v_prochaine_reunion`). */
export type ReunionDeLaLigne = Pick<LigneVue<'v_prochaine_reunion'>, 'date' | 'heure'>

/**
 * Ligne de « Vos saisies » pour la prochaine réunion (maquette 07, BRIEF section 9). Ce que E7
 * appelle : `lignesReunion(reunion)`, avec `reunion` lue par `lireProchaineReunion(ministereId)`
 * (`src/data/reunions.ts`), ou `null`. La vue ne rend que la dernière déclaration dont la date
 * n'est pas passée (règle 15, jour de Paris) : null veut dire « date non confirmée ».
 * - déclarée : Fait, « Fait, lundi 5 oct., 20 h », bouton « Corriger » ;
 * - sinon : À faire, « À faire, date non confirmée », bouton « Renseigner ».
 * Les deux boutons ouvrent le panneau de la prochaine réunion (`/saisir/reunion`). Une seule ligne.
 */
export function lignesReunion(reunion: ReunionDeLaLigne | null): readonly LigneVosSaisies[] {
  if (reunion === null) {
    return [
      {
        cle: 'reunion',
        libelle: 'Prochaine réunion',
        etat: 'a_faire',
        detail: 'À faire, date non confirmée',
        action: { libelle: 'Renseigner', vers: '/saisir/reunion' },
      },
    ]
  }
  return [
    {
      cle: 'reunion',
      libelle: 'Prochaine réunion',
      etat: 'fait',
      detail: `Fait, ${formaterRendezVous(reunion.date, reunion.heure)}`,
      action: { libelle: 'Corriger', vers: '/saisir/reunion' },
    },
  ]
}
