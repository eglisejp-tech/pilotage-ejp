// « Vos saisies » et ouverture de l'accueil du ministère (maquette 07 ; BRIEF, section 9,
// « Accueil du ministère » ; `validation-metier.md`, 4.4 et 4.5). Fonctions pures : chaque lot de
// saisie écrit ses lignes (lignes*.ts), ce fichier les range, puis en tire la phrase, le bouton
// principal et les boutons secondaires. Aucune date du navigateur : le jour de Paris et le
// dimanche de référence viennent de `v_semaine`.

import type {
  BoutonAccueil,
  LigneVosSaisies,
  OuvertureAccueil,
} from '@/features/accueil-ministere/types'
import { TEXTES_ACCUEIL } from '@/features/accueil-ministere/textesAccueil'
import { adresseSaisirUneSession } from '@/features/saisie-session/session'
import type { DateIso } from '@/lib/metier/dates'
import { ajouterMois, moisDe } from '@/lib/metier/periodes'
import { libelleBoutonPrincipal, phraseDAccueil } from '@/lib/metier/phrases'
import type { SaisieDeLaSemaine, TypeSession } from '@/lib/metier/phrases'

/** Les lignes de chaque lot, avant leur rangement. */
export interface PartiesVosSaisies {
  /** `lignesChiffres` (E3) : le dimanche, puis le mois écoulé. */
  chiffres: readonly LigneVosSaisies[]
  /** `lignesSessions` (E4). */
  sessions: readonly LigneVosSaisies[]
  /** `lignesReunion` (E6). */
  reunion: readonly LigneVosSaisies[]
  /** `lignesFij` (E4), ministère `fij` seulement. */
  fij: readonly LigneVosSaisies[]
  /** `lignesEvenements` (E6) : à confirmer, du ministère ou qui le mentionnent. */
  evenements: readonly LigneVosSaisies[]
}

/**
 * Lignes de « Vos saisies » dans l'ordre du BRIEF : chiffres du dimanche, chiffres du mois
 * écoulé, chaque session attendue, prochaine réunion, carte des FIJ et chiffres par département
 * (ministère `fij`), puis les événements.
 */
export function rangerVosSaisies(parties: PartiesVosSaisies): LigneVosSaisies[] {
  const dimanche = parties.chiffres.filter((ligne) => ligne.cle === 'dimanche')
  const autresChiffres = parties.chiffres.filter((ligne) => ligne.cle !== 'dimanche')
  return [
    ...dimanche,
    ...autresChiffres,
    ...parties.sessions,
    ...parties.reunion,
    ...parties.fij,
    ...parties.evenements,
  ]
}

/** Ce que la phrase et les boutons lisent en plus des lignes. */
export interface ContexteOuverture {
  /** `v_semaine` : jour de Paris, dimanche de référence et numéro de la semaine. */
  semaine: { aujourdhui: DateIso; dimanche: DateIso; numero: number }
  /** Sessions lues pour `lignesSessions` : leur type et leur nom font la phrase et le bouton. */
  sessions: readonly {
    session_id: string
    type: TypeSession
    intitule: string | null
    date: DateIso
  }[]
  /** Le ministère du compte est-il `fij` ? Il a alors « Mettre à jour la carte des FIJ ». */
  estFij: boolean
}

const PREFIXE_SESSION = 'session:'
const PREFIXE_EVENEMENT = 'evenement:'

/**
 * Ce qu'une ligne devient dans la phrase et pour le bouton principal. Un événement compte
 * seulement s'il attend une action du ministère (le sien, à confirmer : `a_faire` avec un bouton) ;
 * un événement qui le mentionne n'a rien à faire. Null : ligne inconnue, laissée hors de la phrase.
 */
export function saisieDeLaLigne(
  ligne: LigneVosSaisies,
  contexte: ContexteOuverture,
): SaisieDeLaSemaine | null {
  const fait = ligne.etat === 'fait'
  if (ligne.cle === 'dimanche') {
    return { type: 'dimanche', dimanche: contexte.semaine.dimanche, fait }
  }
  if (ligne.cle === 'mois') {
    const mois = ajouterMois(moisDe(contexte.semaine.aujourdhui), -1)
    return { type: 'mois', mois: Number(mois.slice(5, 7)), fait }
  }
  if (ligne.cle === 'reunion') return { type: 'reunion', fait }
  if (ligne.cle === 'carte_fij') return { type: 'carte_fij', fait }
  if (ligne.cle === 'fij_statistiques') return { type: 'fij_statistiques', fait }
  if (ligne.cle.startsWith(PREFIXE_SESSION)) {
    const id = ligne.cle.slice(PREFIXE_SESSION.length)
    const session = contexte.sessions.find((candidate) => candidate.session_id === id)
    if (session === undefined) return null
    return {
      type: 'session',
      session: session.type,
      intitule: session.intitule,
      date: session.date,
      fait,
    }
  }
  if (ligne.cle.startsWith(PREFIXE_EVENEMENT)) {
    return { type: 'evenement', fait: fait || ligne.action === null }
  }
  return null
}

/** Identifiants des sessions de la semaine qui restent à saisir (« Saisir une session »). */
function sessionsASaisir(lignes: readonly LigneVosSaisies[]): string[] {
  return lignes
    .filter((ligne) => ligne.cle.startsWith(PREFIXE_SESSION) && ligne.etat === 'a_faire')
    .map((ligne) => ligne.cle.slice(PREFIXE_SESSION.length))
}

/**
 * Ouverture de l'accueil : la phrase (`phraseDAccueil`), le bouton principal (la première ligne
 * « À faire » qui a un bouton, libellé par `libelleBoutonPrincipal`, adresse de sa ligne), puis
 * les boutons secondaires, dans l'ordre de la maquette 07 : « Saisir une session », « Nouveau
 * point » (toujours là, jamais le bouton principal) et, pour `fij`, « Mettre à jour la carte des
 * FIJ », sans celui qui est devenu le bouton principal. Le dimanche de référence bascule le
 * dimanche à 12 h (heure de Paris) : la ligne des chiffres redevient « À faire » et le bouton
 * principal redevient « Saisir les chiffres du dimanche ».
 */
export function construireOuverture(
  lignes: readonly LigneVosSaisies[],
  contexte: ContexteOuverture,
): OuvertureAccueil {
  const paires = lignes.flatMap((ligne) => {
    const saisie = saisieDeLaLigne(ligne, contexte)
    return saisie === null ? [] : [{ ligne, saisie }]
  })
  const saisies = paires.map((paire) => paire.saisie)
  const phrase = phraseDAccueil(saisies, contexte.semaine.numero).map((segment) =>
    segment.surligne ? { texte: segment.texte, aDecider: true } : { texte: segment.texte },
  )

  const premiere = paires.find((paire) => !paire.saisie.fait && paire.ligne.action !== null)
  const libelle = premiere ? libelleBoutonPrincipal([premiere.saisie]) : null
  const principal: BoutonAccueil | null =
    premiere && premiere.ligne.action && libelle !== null
      ? { libelle, vers: premiere.ligne.action.vers }
      : null

  const secondaires: BoutonAccueil[] = []
  if (premiere?.saisie.type !== 'session') {
    secondaires.push({
      libelle: TEXTES_ACCUEIL.saisirUneSession,
      vers: adresseSaisirUneSession(sessionsASaisir(lignes)),
    })
  }
  // « Nouveau point » (maquette 07, BRIEF section 9) : jamais le bouton principal, donc toujours là.
  secondaires.push({ libelle: TEXTES_ACCUEIL.nouveauPoint, vers: '/saisir/point' })
  if (contexte.estFij && premiere?.saisie.type !== 'carte_fij') {
    secondaires.push({ libelle: TEXTES_ACCUEIL.carteFij, vers: '/saisir/fij' })
  }
  return { phrase, principal, secondaires }
}
