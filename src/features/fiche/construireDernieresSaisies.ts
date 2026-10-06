// « Dernières saisies » de la fiche (maquettes 04 et 12) : les 5 dernières lignes de journal
// écrites par un compte du ministère, écrites en mots. Le détail ne contient que des codes, des
// nombres et des dates (BRIEF, section 6, « Journal ») ; le seul texte est celui de l'objet visé
// (`cible_texte`, titre actuel d'un point ou d'un événement, masqué s'il l'a été). Une valeur
// d'indicateur propre ou sensible n'est jamais au journal : seules celles des communs s'écrivent.

import type { IndicateurCommun } from '@/data/eglise'
import type { LigneDerniereSaisie } from '@/data/fiche'
import type { DerniereSaisieFiche } from '@/features/fiche/modeleFiche'
import { estDateIso, formaterHorodatage, formaterRendezVous } from '@/lib/metier/dates'
import { accorder, nombre } from '@/lib/metier/texte'

const LIBELLES_COMMUNS: Readonly<Record<string, string>> = {
  service: 'STARs au service',
  actifs: 'STARs actifs',
  en_fij: 'dont en FIJ',
}

/** Libellés des actions (BRIEF, section 6, colonne « Action » de 06), pour les autres lignes. */
const LIBELLES_ACTIONS: Readonly<Record<string, string>> = {
  mesure_saisie: 'Chiffres saisis',
  fij_saisie: 'Carte des FIJ saisie',
  fij_statistiques_saisies: 'Chiffres par département saisis',
  participation_saisie: 'Présence saisie',
  evenement_ajoute: 'Événement ajouté',
  evenement_modifie: 'Événement mis à jour',
  reunion_saisie: 'Prochaine réunion renseignée',
  point_cree: 'Nouveau point',
  point_statut: "Statut d'un point changé",
  point_traite: 'Point marqué traité',
  indicateur_cree: 'Indicateur demandé',
  indicateur_corrige: 'Indicateur corrigé',
}

const AUTRE_SAISIE = 'Saisie enregistrée'

function nombreDe(detail: LigneDerniereSaisie['detail'], cle: string): number | null {
  const valeur = detail?.[cle]
  return typeof valeur === 'number' && Number.isFinite(valeur) ? valeur : null
}

function texteDe(detail: LigneDerniereSaisie['detail'], cle: string): string | null {
  const valeur = detail?.[cle]
  return typeof valeur === 'string' ? valeur : null
}

/** « STARs au service : 10, STARs actifs : 14, dont en FIJ : 11 », ou null sans chiffre commun. */
function chiffresCommuns(
  detail: LigneDerniereSaisie['detail'],
  codes: ReadonlyMap<string, string>,
): string | null {
  const lignes = detail?.['lignes']
  if (!Array.isArray(lignes)) return null
  const morceaux = lignes.flatMap((ligne: unknown) => {
    if (typeof ligne !== 'object' || ligne === null) return []
    const { indicateur_id: id, valeur } = ligne as { indicateur_id?: unknown; valeur?: unknown }
    const code = typeof id === 'string' ? codes.get(id) : undefined
    const libelle = code === undefined ? undefined : LIBELLES_COMMUNS[code]
    if (libelle === undefined || typeof valeur !== 'number') return []
    return [`${libelle} : ${nombre(valeur)}`]
  })
  return morceaux.length === 0 ? null : morceaux.join(', ')
}

function avecObjet(libelle: string, objet: string | null): string {
  return objet === null || objet.trim() === '' ? libelle : `${libelle} : ${objet}`
}

function texteLigne(ligne: LigneDerniereSaisie, codes: ReadonlyMap<string, string>): string {
  const libelle = LIBELLES_ACTIONS[ligne.action] ?? AUTRE_SAISIE
  switch (ligne.action) {
    case 'mesure_saisie':
      return chiffresCommuns(ligne.detail, codes) ?? libelle
    case 'fij_saisie': {
      const total = nombreDe(ligne.detail, 'total')
      return total === null ? libelle : `FIJ par département : ${nombre(total)} au total`
    }
    case 'participation_saisie': {
      const valeur = nombreDe(ligne.detail, 'valeur')
      return valeur === null
        ? libelle
        : `${libelle} : ${nombre(valeur)} ${accorder(valeur, 'présent', 'présents')}`
    }
    case 'reunion_saisie': {
      const date = texteDe(ligne.detail, 'date')
      if (date === null || !estDateIso(date)) return libelle
      return `Prochaine réunion : ${formaterRendezVous(date, texteDe(ligne.detail, 'heure'))}`
    }
    case 'evenement_ajoute':
    case 'evenement_modifie':
    case 'point_cree':
    case 'point_statut':
    case 'point_traite':
    case 'indicateur_cree':
    case 'indicateur_corrige':
      return avecObjet(libelle, ligne.cible_texte)
    default:
      return libelle
  }
}

/** Les lignes de « Dernières saisies », dans l'ordre reçu (de la plus récente à la plus ancienne). */
export function construireDernieresSaisies(
  lignes: readonly LigneDerniereSaisie[],
  communs: readonly IndicateurCommun[],
): DerniereSaisieFiche[] {
  const codes = new Map(
    communs.flatMap((commun) => (commun.code === null ? [] : [[commun.id, commun.code] as const])),
  )
  return lignes.map((ligne) => {
    let texte: string
    try {
      texte = texteLigne(ligne, codes)
    } catch {
      // Une heure ou une date illisible ne casse pas la fiche : la ligne garde son action.
      texte = LIBELLES_ACTIONS[ligne.action] ?? AUTRE_SAISIE
    }
    return { id: ligne.id, quand: formaterHorodatage(ligne.le), texte }
  })
}
