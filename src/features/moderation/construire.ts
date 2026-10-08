import type { LigneTexteARelire } from '@/data/moderation'
import { TEXTE_MASQUE } from '@/features/cette-semaine/textesVides'
import {
  LIBELLES_CIBLE,
  libelleChamp,
  ORDRE_CHAMPS,
  TEXTES_MODERATION,
} from '@/features/moderation/textes'
import type { CibleTexteARelire, EtatTexteARelire } from '@/lib/base'
import { formaterHorodatage, nomDuMois } from '@/lib/metier/dates'
import { comparerNoms } from '@/lib/metier/texte'

/** Un champ libre d'une ligne de la file, tel que la base le rend. */
export interface ChampARelire {
  /** Nom de la colonne : `titre`, `description`, `texte`... C'est ce que `masquer_texte` reçoit. */
  code: string
  /** « Ce qui se passe » */
  libelle: string
  texte: string
  /** Déjà remplacé par « [texte masqué par EJP Tech] » : affiché en `--encre-3`. */
  masque: boolean
}

/** Une ligne de l'écran, prête à afficher : aucune valeur chiffrée n'y entre. */
export interface TexteARelire {
  cible: CibleTexteARelire
  cibleId: string
  /** « Point d'attention, Social » */
  entete: string
  /** « 29 sept., 21 h 40 » (jour et heure de Paris). */
  quand: string
  /** « Visites à domicile, septembre 2026 » : précision d'un chiffre sensible seulement. */
  indicateur: string | null
  champs: ChampARelire[]
  etat: EtatTexteARelire
  /** « Relu le 29 sept. : rien à signaler » ou « Masqué le 29 sept. : nom d'une personne ». */
  decision: string | null
  /** Les champs que « Masquer le texte » peut encore remplacer (les non masqués). */
  masquables: ChampARelire[]
}

/** Un ministère, pour le nom de l'auteur. */
export interface MinistereNom {
  id: string
  nom: string
}

/** « septembre 2026 », d'après le premier jour du mois (« 2026-09-01 »). */
export function libelleMois(mois: string): string {
  const morceaux = /^(\d{4})-(\d{2})-\d{2}$/.exec(mois)
  if (!morceaux) return ''
  return `${nomDuMois(Number(morceaux[2]))} ${morceaux[1]}`
}

/** Les champs non vides, dans l'ordre du formulaire d'origine, puis les autres par nom. */
function lireChamps(ligne: LigneTexteARelire): ChampARelire[] {
  const ordre = ORDRE_CHAMPS[ligne.cible]
  const codes = Object.keys(ligne.champs).sort((a, b) => {
    const rangA = ordre.indexOf(a)
    const rangB = ordre.indexOf(b)
    if (rangA !== -1 || rangB !== -1)
      return (rangA === -1 ? 99 : rangA) - (rangB === -1 ? 99 : rangB)
    return comparerNoms(a, b)
  })
  const champs: ChampARelire[] = []
  for (const code of codes) {
    const texte = ligne.champs[code]
    if (typeof texte !== 'string' || texte.trim() === '') continue
    champs.push({
      code,
      libelle: libelleChamp(ligne.cible, code),
      texte,
      masque: texte === TEXTE_MASQUE,
    })
  }
  return champs
}

function lireDecision(ligne: LigneTexteARelire): string | null {
  if (ligne.decision_le === null) return null
  if (ligne.etat === 'relu') return TEXTES_MODERATION.relu(ligne.decision_le)
  if (ligne.etat === 'masque') return TEXTES_MODERATION.masque(ligne.decision_le, ligne.motif)
  return null
}

/**
 * Les lignes de la file, pour l'écran : d'abord les textes à relire, puis ceux des 30 derniers
 * jours que la base garde, chaque groupe du plus récent au plus ancien (comme la maquette 15).
 * L'en-tête d'une ligne dit le type puis le ministère de l'auteur, ou son libellé quand il n'a
 * pas de ministère (« Berger », « Conseil, compte 3 »).
 */
export function construireTextesARelire(
  lignes: readonly LigneTexteARelire[],
  ministeres: readonly MinistereNom[],
): TexteARelire[] {
  const noms = new Map(ministeres.map((ministere) => [ministere.id, ministere.nom]))
  const rang = (etat: EtatTexteARelire) => (etat === 'a_relire' ? 0 : 1)
  return [...lignes]
    .sort(
      (a, b) =>
        rang(a.etat) - rang(b.etat) ||
        b.ecrit_le.localeCompare(a.ecrit_le) ||
        a.cible_id.localeCompare(b.cible_id),
    )
    .map((ligne) => {
      const origine =
        (ligne.ministere_id === null ? undefined : noms.get(ligne.ministere_id)) ??
        ligne.auteur_libelle
      const champs = lireChamps(ligne)
      const mois = ligne.mois === null ? '' : libelleMois(ligne.mois)
      const indicateur =
        ligne.cible === 'precision_sensible' && ligne.indicateur_libelle !== null
          ? [ligne.indicateur_libelle, mois].filter((morceau) => morceau !== '').join(', ')
          : null
      return {
        cible: ligne.cible,
        cibleId: ligne.cible_id,
        entete: `${LIBELLES_CIBLE[ligne.cible]}, ${origine}`,
        quand: formaterHorodatage(ligne.ecrit_le),
        indicateur,
        champs,
        etat: ligne.etat,
        decision: lireDecision(ligne),
        masquables: champs.filter((champ) => !champ.masque),
      }
    })
}

/** « N textes en attente » : les éléments encore à relire. */
export function compterEnAttente(textes: readonly TexteARelire[]): number {
  return textes.filter((texte) => texte.etat === 'a_relire').length
}
