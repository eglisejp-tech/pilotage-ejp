import type { EvenementLu } from '@/data/evenements'
import type { LigneVosSaisies } from '@/features/accueil-ministere/types'
import { evenementsAConfirmer } from '@/lib/metier/alerteEvenements'
import { formaterJourSemaine } from '@/lib/metier/dates'
import { texteDesJours } from '@/lib/metier/evenements'

/** Espace insécable : les guillemets français ne se séparent pas du titre. */
const NBSP = String.fromCodePoint(0xa0)

/**
 * Lignes de « Vos saisies » pour les événements à confirmer du ministère, ou qui le mentionnent
 * (maquette 07 ; `validation-metier.md`, 4.4 et 4.5 ; T31). Ce que E7 appelle :
 * `lignesEvenements(evenements, ministereId, noms)`, avec `evenements` lus par
 * `lireEvenementsMinistere(ministereId)` (`src/data/evenements.ts`), `ministereId` le ministère du
 * compte et `noms` les noms des ministères (`lireMinisteres`, clé « ministeres / liste »).
 *
 * Une ligne par événement à confirmer (`a_confirmer`, lu dans la vue : jamais la date du
 * navigateur), sans dépendre de la semaine de référence, la date la plus ancienne d'abord :
 * - événement du ministère : `etat: 'a_faire'`, « À faire : en attente de validation, dans
 *   3 jours » (ou « date passée depuis 2 jours »), bouton « Mettre à jour » vers le panneau ;
 * - événement qui le mentionne : `etat: 'fait'` (il n'y a rien à faire pour ce ministère, la
 *   phrase d'accueil ne le compte donc pas), « Mentionné par Communication : en attente de
 *   validation, dans 3 jours », aucun bouton.
 * Le libellé reprend le titre entre guillemets (la ligne peut citer un texte libre, la phrase de
 * l'accueil, jamais).
 */
export function lignesEvenements(
  evenements: readonly EvenementLu[],
  ministereId: string,
  noms: ReadonlyMap<string, string>,
): readonly LigneVosSaisies[] {
  return evenementsAConfirmer(evenements).map((evenement): LigneVosSaisies => {
    const libelle = `Événement «${NBSP}${evenement.titre}${NBSP}», ${formaterJourSemaine(evenement.date)}`
    const quand = `en attente de validation, ${texteDesJours(evenement.jours)}`
    if (evenement.ministere_id === ministereId) {
      return {
        cle: `evenement:${evenement.id}`,
        libelle,
        etat: 'a_faire',
        detail: `À faire : ${quand}`,
        action: { libelle: 'Mettre à jour', vers: `/saisir/evenement/${evenement.id}` },
      }
    }
    return {
      cle: `evenement:${evenement.id}`,
      libelle,
      etat: 'fait',
      detail: `Mentionné par ${noms.get(evenement.ministere_id) ?? 'un autre ministère'} : ${quand}`,
      action: null,
    }
  })
}
