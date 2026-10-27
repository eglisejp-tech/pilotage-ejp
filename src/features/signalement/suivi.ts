import type { EtapeDuSuivi, LigneSignalement } from '@/data/signalements'
import {
  jourDeLaBase,
  jourDuSignalement,
  TEXTES_BLOC_SIGNALEMENTS,
  TEXTES_SUIVI,
} from '@/features/signalement/textes'
import { jourDeParis } from '@/lib/metier/dates'

// Le suivi d'un signalement à l'écran (T77), en fonctions pures : les groupes de « Mes
// signalements » et du bloc d'EJP Tech, la ligne d'état et le suivi daté. Tout vient de la base :
// le statut, la fin, l'âge (`jours_depuis`) et la date limite (`reponse_possible_jusquau`) ; les
// horodatages ne sont que mis en forme au jour de Paris, jamais comparés à l'horloge du navigateur.

/** Qui lit : le ministère du signalement (« Votre réponse ») ou EJP Tech (« Réponse du ministère »). */
export type Lecteur = 'ministere' | 'ejp_tech'

/** Un texte cité du suivi, avec la ligne qui le porte (cible de « Masquer », EJP Tech). */
export interface Citation {
  texte: string
  /** Ligne de `signalement_suivi` : cible `signalement_suivi`, champ `commentaire`. */
  suiviId: string
}

/** Une ligne du suivi daté : « 27 oct. Réponse d'EJP Tech : « ... » ». */
export interface EtapeAffichee {
  cle: string
  /** Jour de Paris (AAAA-MM-JJ), pour `<time datetime>`. */
  jour: string
  /** « 27 oct. » */
  jourAffiche: string
  libelle: string
  citation: Citation | null
}

/** Les lignes de suivi d'un signalement, dans l'ordre réel (`ordre`). */
export function lignesDe(suivi: readonly EtapeDuSuivi[], signalementId: string): EtapeDuSuivi[] {
  return suivi
    .filter((ligne) => ligne.signalement_id === signalementId)
    .sort((a, b) => a.ordre - b.ordre)
}

function etape(cle: string, instant: string, libelle: string, citation: Citation | null) {
  const jour = jourDeParis(instant)
  return { cle, jour, jourAffiche: jourDeLaBase(jour), libelle, citation }
}

/**
 * Le suivi daté, du plus ancien au plus récent : l'envoi, puis une ligne par étape, puis la
 * clôture automatique quand la base l'a calculée.
 */
export function etapesDuSuivi(
  signalement: LigneSignalement,
  lignes: readonly EtapeDuSuivi[],
  lecteur: Lecteur,
): EtapeAffichee[] {
  const ministere = lecteur === 'ministere'
  const etapes: EtapeAffichee[] = [
    etape('envoi', signalement.saisi_le, TEXTES_SUIVI.etapeEnvoi, null),
  ]
  for (const ligne of lignes) {
    const citation =
      ligne.commentaire === null ? null : { texte: ligne.commentaire, suiviId: ligne.id }
    switch (ligne.etape) {
      case 'en_cours':
        etapes.push(etape(ligne.id, ligne.saisi_le, TEXTES_SUIVI.etapeEnCours, null))
        break
      case 'reponse':
        etapes.push(etape(ligne.id, ligne.saisi_le, TEXTES_SUIVI.etapeReponse, citation))
        break
      case 'reponse_ministere':
        etapes.push(
          etape(
            ligne.id,
            ligne.saisi_le,
            ministere
              ? TEXTES_SUIVI.etapeReponseMinistere
              : TEXTES_BLOC_SIGNALEMENTS.etapeReponseMinistere,
            citation,
          ),
        )
        break
      case 'regle':
        etapes.push(
          etape(
            ligne.id,
            ligne.saisi_le,
            ministere ? TEXTES_SUIVI.etapeRegle : TEXTES_BLOC_SIGNALEMENTS.etapeRegle,
            null,
          ),
        )
        break
      case 'clos':
        etapes.push(
          etape(
            ligne.id,
            ligne.saisi_le,
            citation ? `${TEXTES_SUIVI.etapeClos} :` : TEXTES_SUIVI.etapeClos,
            citation,
          ),
        )
        break
    }
  }
  if (signalement.fin === 'automatique' && signalement.clos_le !== null) {
    etapes.push(
      etape(
        'automatique',
        signalement.clos_le,
        ministere ? TEXTES_SUIVI.etapeAutomatique : TEXTES_BLOC_SIGNALEMENTS.etapeAutomatique,
        null,
      ),
    )
  }
  return etapes
}

/** La dernière réponse d'EJP Tech (étape Répondu) : le texte à vérifier, et sa ligne. */
export function derniereReponse(lignes: readonly EtapeDuSuivi[]): Citation | null {
  const reponse = [...lignes].reverse().find((ligne) => ligne.etape === 'reponse')
  return reponse?.commentaire ? { texte: reponse.commentaire, suiviId: reponse.id } : null
}

/** La réponse de « Clore le signalement », s'il y en a une. */
export function reponseDeCloture(lignes: readonly EtapeDuSuivi[]): Citation | null {
  const cloture = lignes.find((ligne) => ligne.etape === 'clos')
  return cloture?.commentaire ? { texte: cloture.commentaire, suiviId: cloture.id } : null
}

/** Ligne d'état d'un signalement, pour le ministère (« Mes signalements »). */
export function ligneEtatMinistere(signalement: LigneSignalement): string {
  const jour = jourDuSignalement(signalement.statut_le)
  switch (signalement.statut) {
    case 'recu':
      return TEXTES_SUIVI.recu(jourDuSignalement(signalement.saisi_le))
    case 'en_cours':
      return signalement.derniere_etape === 'reponse_ministere'
        ? TEXTES_SUIVI.enCoursApresReponse(jour)
        : TEXTES_SUIVI.enCours(jour)
    case 'repondu':
      return TEXTES_SUIVI.repondu(jour)
    case 'clos': {
      const clos = jourDuSignalement(signalement.clos_le ?? signalement.statut_le)
      if (signalement.fin === 'confirme') return TEXTES_SUIVI.closConfirme(clos)
      if (signalement.fin === 'automatique') return TEXTES_SUIVI.closSansRetour(clos)
      return TEXTES_SUIVI.closEjpTech(clos)
    }
  }
}

/** Ligne d'état d'un signalement, pour EJP Tech (bloc « Signalements »). */
export function ligneEtatEjpTech(signalement: LigneSignalement): string {
  const jour = jourDuSignalement(signalement.statut_le)
  const age = signalement.jours_depuis
  switch (signalement.statut) {
    case 'recu':
      return signalement.compte_actif
        ? TEXTES_BLOC_SIGNALEMENTS.recu(age, jour)
        : TEXTES_BLOC_SIGNALEMENTS.sansCompte
    case 'en_cours':
      if (!signalement.compte_actif) return TEXTES_BLOC_SIGNALEMENTS.sansCompte
      return signalement.derniere_etape === 'reponse_ministere'
        ? TEXTES_BLOC_SIGNALEMENTS.reponseMinistere(age, jour)
        : TEXTES_BLOC_SIGNALEMENTS.enCours(age, jour)
    case 'repondu':
      return TEXTES_BLOC_SIGNALEMENTS.repondu(
        jour,
        signalement.reponse_possible_jusquau === null
          ? jour
          : jourDeLaBase(signalement.reponse_possible_jusquau),
      )
    case 'clos': {
      const clos = jourDuSignalement(signalement.clos_le ?? signalement.statut_le)
      if (signalement.fin === 'confirme') return TEXTES_BLOC_SIGNALEMENTS.closConfirme(clos)
      if (signalement.fin === 'automatique') return TEXTES_BLOC_SIGNALEMENTS.closSansRetour(clos)
      return TEXTES_BLOC_SIGNALEMENTS.closEjpTech(clos)
    }
  }
}

/** Les clos des 30 derniers jours (filtre de la base), les derniers clos d'abord. */
function closRecents(signalements: readonly LigneSignalement[]): LigneSignalement[] {
  return signalements
    .filter((ligne) => ligne.statut === 'clos' && ligne.clos_recent)
    .sort((a, b) => Date.parse(b.clos_le ?? '') - Date.parse(a.clos_le ?? ''))
}

/**
 * Les groupes de « Mes signalements », dans cet ordre : « À vérifier » (Répondu), « En cours »
 * (Reçu, En cours), « Clos ces 30 derniers jours ». Les ouverts gardent l'ordre de la lecture,
 * du plus ancien au plus récent.
 */
export function groupesMinistere(signalements: readonly LigneSignalement[]) {
  return {
    aVerifier: signalements.filter((ligne) => ligne.statut === 'repondu'),
    enCours: signalements.filter((ligne) => ligne.statut === 'recu' || ligne.statut === 'en_cours'),
    clos: closRecents(signalements),
  }
}

/**
 * Les groupes du bloc d'EJP Tech : « À traiter » (Reçu, En cours : ce qui attend un geste d'EJP
 * Tech), « En attente du ministère » (Répondu), « Clos ces 30 derniers jours ».
 */
export function groupesEjpTech(signalements: readonly LigneSignalement[]) {
  return {
    aTraiter: signalements.filter(
      (ligne) => ligne.statut === 'recu' || ligne.statut === 'en_cours',
    ),
    attente: signalements.filter((ligne) => ligne.statut === 'repondu'),
    clos: closRecents(signalements),
  }
}

/** Les gestes qu'EJP Tech peut faire sur une ligne (la base refuse les autres). */
export function gestesEjpTech(signalement: LigneSignalement) {
  const ouvert = signalement.statut === 'recu' || signalement.statut === 'en_cours'
  return {
    prendre: ouvert && signalement.compte_actif && signalement.statut === 'recu',
    repondre: ouvert && signalement.compte_actif,
    /** « Clore le signalement », discret ; seul et ordinaire sans compte actif. */
    clore: ouvert,
    cloreSeul: ouvert && !signalement.compte_actif,
  }
}

/** Ce que montre « Ma semaine » : le bandeau d'un Répondu, sinon la ligne discrète, sinon rien. */
export type SuiviDeLaSemaine =
  | { genre: 'bandeau'; nombre: number; plusAncien: { id: string; saisi_le: string } }
  | { genre: 'ligne'; nombre: number }
  | null

/** « Ma semaine » à partir des ouverts du ministère (lus du plus ancien au plus récent). */
export function suiviDeLaSemaine(
  ouverts: readonly Pick<LigneSignalement, 'id' | 'saisi_le' | 'statut'>[],
): SuiviDeLaSemaine {
  const repondus = ouverts.filter((ligne) => ligne.statut === 'repondu')
  const plusAncien = repondus[0]
  if (plusAncien) {
    return {
      genre: 'bandeau',
      nombre: repondus.length,
      plusAncien: { id: plusAncien.id, saisi_le: plusAncien.saisi_le },
    }
  }
  const suivis = ouverts.filter((ligne) => ligne.statut === 'recu' || ligne.statut === 'en_cours')
  return suivis.length > 0 ? { genre: 'ligne', nombre: suivis.length } : null
}
