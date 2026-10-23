import type { EvenementLu } from '@/data/evenements'
import type { LigneVosSaisies } from '@/features/accueil-ministere/types'
import { evenementsAConfirmer } from '@/lib/metier/alerteEvenements'
import { formaterJourSemaine } from '@/lib/metier/dates'
import { resteARenseigner, texteDesJours, trierEvenements } from '@/lib/metier/evenements'

/** Espace insécable : les guillemets français ne se séparent pas du titre. */
const NBSP = String.fromCodePoint(0xa0)

/** Préfixe de la ligne « heure de début à indiquer » (T68), distinct de celui du statut. */
export const PREFIXE_HEURE_DEBUT = 'heure-debut:'

/** Un événement du ministère lu pour « Vos saisies » : son dernier état et son heure de début. */
export type EvenementARappeler = EvenementLu & { heure_debut: number | null }

const MISE_A_JOUR = (id: string) => ({ libelle: 'Mettre à jour', vers: `/saisir/evenement/${id}` })

function libelleDe(evenement: EvenementLu): string {
  return `Événement «${NBSP}${evenement.titre}${NBSP}», ${formaterJourSemaine(evenement.date)}`
}

/**
 * Lignes de « Vos saisies » pour les événements du ministère, ou qui le mentionnent (maquette 07 ;
 * `validation-metier.md`, 4.4 et 4.5 ; T31, T68). Ce que E7 appelle :
 * `lignesEvenements(evenements, ministereId, noms, aRenseigner)`, avec `evenements` lus par
 * `lireEvenementsMinistere(ministereId)` et `aRenseigner` par `lireEvenementsARenseigner(ministereId)`
 * (`src/data/evenements.ts`), `ministereId` le ministère du compte et `noms` les noms des ministères
 * (`lireMinisteres`, clé « ministeres / liste »).
 *
 * Une ligne par événement, la date la plus ancienne d'abord, sans dépendre de la semaine de
 * référence (`jours` et `a_confirmer` sont lus dans la vue : jamais la date du navigateur) :
 * - événement du ministère à confirmer : `etat: 'a_faire'`, « À faire : en attente de validation,
 *   dans 3 jours » (ou « date passée depuis 2 jours »), bouton « Mettre à jour » vers le panneau ;
 * - événement du ministère passé depuis 30 jours au plus sans état final (T68) : « À faire : statut
 *   à mettre à jour, date passée depuis 3 jours », même bouton ;
 * - événement du ministère Terminé, du jour ou des 30 derniers jours, sans heure de début (T68) :
 *   « À faire : heure de début à indiquer », même bouton (clé `heure-debut:<id>`) ;
 * - événement à confirmer qui le mentionne : `etat: 'fait'` (il n'y a rien à faire pour ce
 *   ministère, la phrase d'accueil ne le compte donc pas), « Mentionné par Communication : en
 *   attente de validation, dans 3 jours », aucun bouton.
 * Le libellé reprend le titre entre guillemets (la ligne peut citer un texte libre, la phrase de
 * l'accueil, jamais).
 */
export function lignesEvenements(
  evenements: readonly EvenementLu[],
  ministereId: string,
  noms: ReadonlyMap<string, string>,
  aRenseigner: readonly EvenementARappeler[] = [],
): readonly LigneVosSaisies[] {
  const aConfirmer = evenementsAConfirmer(evenements)
  const dejaDites = new Set(aConfirmer.map((evenement) => evenement.id))
  const lignes = aConfirmer.map((evenement) => {
    const quand = `en attente de validation, ${texteDesJours(evenement.jours)}`
    const ligne: LigneVosSaisies =
      evenement.ministere_id === ministereId
        ? {
            cle: `evenement:${evenement.id}`,
            libelle: libelleDe(evenement),
            etat: 'a_faire',
            detail: `À faire : ${quand}`,
            action: MISE_A_JOUR(evenement.id),
          }
        : {
            cle: `evenement:${evenement.id}`,
            libelle: libelleDe(evenement),
            etat: 'fait',
            detail: `Mentionné par ${noms.get(evenement.ministere_id) ?? 'un autre ministère'} : ${quand}`,
            action: null,
          }
    return { date: evenement.date, titre: evenement.titre, ligne }
  })
  for (const evenement of aRenseigner) {
    if (evenement.ministere_id !== ministereId || dejaDites.has(evenement.id)) continue
    dejaDites.add(evenement.id)
    const reste = resteARenseigner(evenement)
    if (reste === null) continue
    lignes.push({
      date: evenement.date,
      titre: evenement.titre,
      ligne: {
        cle:
          reste === 'heure_debut'
            ? `${PREFIXE_HEURE_DEBUT}${evenement.id}`
            : `evenement:${evenement.id}`,
        libelle: libelleDe(evenement),
        etat: 'a_faire',
        detail:
          reste === 'heure_debut'
            ? 'À faire : heure de début à indiquer'
            : `À faire : statut à mettre à jour, ${texteDesJours(evenement.jours)}`,
        action: MISE_A_JOUR(evenement.id),
      },
    })
  }
  return trierEvenements(lignes).map((entree) => entree.ligne)
}
