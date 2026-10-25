// Liste des ministères (`/ministeres`, berger, conseil et EJP Tech ; BRIEF, section 9) : le
// tableau « Les ministères » de 01, avec la description sous le nom, chaque nom ouvrant la fiche.
// Ministères actifs seulement (`v_tableau_ministeres`), du moins récent au plus récent (règle 6).
// Pour EJP Tech, le repère « Prévus : à choisir » d'un ministère sans liste choisie (T72).
// Fonction pure : le jour de Paris vient de `v_semaine`.

import type { LigneVue, Priorite } from '@/lib/base'
import type { TexteLibre } from '@/features/fiche/modeleFiche'
import { TEXTE_MASQUE } from '@/features/fiche/textesFiche'
import { formaterJourCourt } from '@/lib/metier/dates'
import type { DateIso } from '@/lib/metier/dates'
import { fraicheur, trierParFraicheur } from '@/lib/metier/fraicheur'
import type { EtatFraicheur } from '@/lib/metier/fraicheur'

/** Une ligne de la liste, prête à afficher. */
export interface LigneListeMinistere {
  id: string
  nom: string
  /** Description écrite par l'administration (sans relecture) ; null si vide. */
  description: string | null
  /** Fiche 04 du ministère. */
  href: string
  fraicheur: { libelle: string; etat: EtatFraicheur }
  /** « 14 nov. » et le nom de l'événement ; null : aucun événement prévu. */
  prochainEvenement: { date: string; nom: TexteLibre } | null
  /** « 6 oct. » ; null : non renseignée. */
  prochaineReunion: string | null
  /** Priorité la plus haute des points ouverts créés par le ministère ; null : aucun. */
  pointOuvert: Priorite | null
  /**
   * Repère d'EJP Tech (T72) : aucune liste d'indicateurs prévus n'est choisie pour ce ministère ;
   * `/indicateurs/:id`, où se fait le choix.
   */
  prevusAChoisir: { href: string } | null
}

/**
 * Ministères sans liste choisie, d'après `v_ministere_modele` (EJP Tech) : ceux dont la ligne n'a
 * pas de modèle. Un ministère absent de la lecture n'en a pas non plus.
 */
export function ministeresSansListe(
  liens: readonly Pick<LigneVue<'v_ministere_modele'>, 'ministere_id' | 'modele'>[],
  ministeres: readonly { ministere_id: string }[],
): ReadonlySet<string> {
  const choisis = new Set(
    liens.filter((lien) => lien.modele !== null).map((lien) => lien.ministere_id),
  )
  return new Set(
    ministeres.map((ministere) => ministere.ministere_id).filter((id) => !choisis.has(id)),
  )
}

/**
 * Lignes de la liste, du moins récent au plus récent (« Aucune saisie » d'abord), puis par nom.
 * `sansListe` : les ministères sans liste d'indicateurs prévus choisie, lus pour EJP Tech
 * seulement (T72) ; vide pour les autres profils.
 */
export function construireListeMinisteres(
  tableau: readonly LigneVue<'v_tableau_ministeres'>[],
  aujourdhui: DateIso,
  sansListe: ReadonlySet<string> = new Set(),
): LigneListeMinistere[] {
  return trierParFraicheur(tableau, aujourdhui).map((ligne) => {
    const { libelle, etat } = fraicheur(ligne.derniere_saisie, aujourdhui)
    return {
      prevusAChoisir: sansListe.has(ligne.ministere_id)
        ? { href: `/indicateurs/${ligne.ministere_id}` }
        : null,
      id: ligne.ministere_id,
      nom: ligne.nom,
      description:
        ligne.description === null || ligne.description.trim() === '' ? null : ligne.description,
      href: `/ministeres/${ligne.ministere_id}`,
      fraicheur: { libelle, etat },
      prochainEvenement:
        ligne.prochain_evenement_date === null || ligne.prochain_evenement_titre === null
          ? null
          : {
              date: formaterJourCourt(ligne.prochain_evenement_date),
              nom: {
                texte: ligne.prochain_evenement_titre,
                masque: ligne.prochain_evenement_titre === TEXTE_MASQUE,
              },
            },
      prochaineReunion:
        ligne.prochaine_reunion_date === null
          ? null
          : formaterJourCourt(ligne.prochaine_reunion_date),
      pointOuvert: ligne.point_ouvert_priorite,
    }
  })
}
