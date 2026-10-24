// Catalogue des états vides de la vue « Cette semaine » (étape 3 ; docs/decisions.md, T22) :
// chaque bloc qui peut manquer de données dit ce qui manque, jamais un blanc ni un zéro trompeur.
// Partagé par la couche de données (construire.ts écrit les dates, les libellés et les phrases)
// et l'écran (les composants écrivent les valeurs et les messages) : aucun composant n'écrit un
// de ces textes en dur.
//
// Sources : docs/reference/maquettes/LISEZMOI.md, « États » ; BRIEF.md, sections 3 et 9 ;
// « proposé » quand ni l'un ni l'autre ne donne le texte.
//
// Textes vides déjà écrits par les fonctions métier, à ne pas réécrire :
// - « Aucun ministère n'a encore saisi les chiffres du dimanche 27 sept. » (phrase, partie A) :
//   phraseDeLaSemaine et phraseDeLEglise (src/lib/metier/phrases.ts), BRIEF section 9 ;
// - complétude sans saisie « 0 sur 8 » : libelleCompletude(0, attendus), LISEZMOI ;
// - carte sans département « 0 dép. » : libelleDepartements(0) ;
// - ligne secondaire sans rien à signaler : `null`, la ligne ne s'affiche pas.

import { libelleAceJour } from '@/lib/metier/completude'
import { libelleFraicheur } from '@/lib/metier/fraicheur'
import type { TypeSession } from '@/lib/metier/phrases'
import { NON_CALCULE } from '@/lib/metier/pourcentage'
import { nombre } from '@/lib/metier/texte'

/**
 * Marqueur que la base écrit à la place d'un champ libre masqué (`private.masquer_texte`, BRIEF
 * règle 9). Un texte égal à cette valeur porte `masque: true` (TexteLibre) ; il s'affiche
 * « [texte masqué] » en `--encre-3` (`TEXTE_MASQUE_AFFICHE`, T66 t356).
 */
export const TEXTE_MASQUE = '[texte masqué par EJP Tech]'

export const TEXTES_VIDES = {
  page: {
    /**
     * Après 300 ms sans réponse, avec la flamme vivante, à la place du contenu, avec aria-busy.
     * LISEZMOI, « Chargement » ; T65 : le texte dit ce qui charge (Proposé).
     */
    chargement: 'Chargement de Cette semaine',
    /**
     * Panneau de saisie qui lit ce qu'il lui faut avant d'afficher le formulaire (événement,
     * réunion, point, chiffres, carte des FIJ, session), sous son titre déjà affiché (T65).
     */
    chargementFormulaire: 'Chargement du formulaire',
    /** Lecture en échec, ou sans réponse après 10 s : bandeau role="alert". LISEZMOI. */
    erreur: 'La connexion a échoué. Réessayez.',
    /** Bouton du bandeau d'erreur. LISEZMOI, « Erreur de page ». */
    reessayer: 'Réessayer',
  },

  chiffres: {
    /**
     * Valeur absente (`ValeurAffichee` à l'état `vide`) : dimanche de référence sans saisie,
     * aucune valeur « à ce jour », aucun ministère avec les deux valeurs du pourcentage FIJ,
     * carte jamais saisie, session sans saisie ou type de session jamais tenu (T22).
     * LISEZMOI, « Premier dimanche ».
     */
    valeur: 'Pas encore de saisie',
    /** Pourcentage FIJ quand la somme des actifs est nulle (état `non_calcule`). BRIEF règle 4. */
    nonCalcule: NON_CALCULE,
    /** Date d'une ligne « à ce jour » sans valeur (actifs, FIJ, carte). BRIEF règle 13. */
    dateAceJour: libelleAceJour(0).libelle,
    /** Date d'une ligne de session quand ce type n'a encore aucune session passée. Proposé. */
    dateSansSession: "Aucune session pour l'instant",
    /** Point de courbe sans saisie, dans sa description texte. Proposé. */
    pointDeCourbeSansSaisie: 'sans saisie',
    /**
     * Note sous le tableau tant qu'aucune courbe n'a deux points : une seule phrase, pas une par
     * ligne. LISEZMOI, « Premier usage » (proposition 11, T69).
     */
    notePremierUsage: 'Les courbes apparaîtront avec les premières saisies.',
    /**
     * Note sous le tableau dès qu'une courbe a deux points : sa période, puis ce que disent un
     * trou et un rond vide (proposition 11 et écart 4, T69). Proposé.
     */
    noteCourbes:
      "Courbes : 10 derniers dimanches ou 4 dernières sessions. Un trou : aucune saisie ; un rond vide : des ministères n'ont pas saisi.",
  },

  aDecider: {
    /** Aucun point ouvert. BRIEF section 9 ; LISEZMOI, « Vide » (05). */
    aucunPoint: 'Aucun point ouvert.',
  },

  session: {
    /** Titre du bloc quand aucune session n'est affichée. Étape 1 (BlocSession). */
    titre: 'Dernière session',
    /**
     * Aucune session passée, tous types confondus. LISEZMOI, « Premier dimanche » ; revu par T66
     * (t182) : sans « déclarer », et sans la phrase qui disait qui ajoute les sessions (t183).
     */
    aucuneSession: "Aucune session pour l'instant.",
    /** `?session=` d'un type qui n'a encore aucune session passée. Proposé ; glossaire (t184). */
    aucuneSessionDuType: {
      batir: "Aucune session Bâtir l'Église pour l'instant.",
      anti_dispersion: "Aucune session Anti-Dispersion pour l'instant.",
      autre: "Aucune autre session pour l'instant.",
    } satisfies Record<TypeSession, string>,
    /** À la place du grand chiffre, quand aucun ministère n'a saisi la session. LISEZMOI. */
    totalSansSaisie: 'Pas encore de saisie',
    /** Sous le grand chiffre, quand aucun ministère n'a saisi la session. Proposé. */
    resumeSansSaisie: (attendus: number): string => {
      if (attendus === 0) return 'Aucun ministère attendu pour cette session.'
      if (attendus === 1) return "Le ministère attendu n'a pas encore saisi."
      return `Aucun des ${nombre(attendus)} ministères attendus n'a encore saisi.`
    },
    /** Apport d'un ministère attendu qui n'a pas saisi. Maquettes 01 à 03. */
    apportManquant: 'À saisir',
  },

  carte: {
    /** FIJ n'a jamais envoyé la carte. LISEZMOI, « Premier dimanche ». */
    vide: "La carte s'affichera quand FIJ aura saisi ses chiffres.",
    /** Carré d'un département sans valeur. Étape 1 (CarteFij). */
    departementSansValeur: 'À saisir',
  },

  ministeres: {
    /** Aucun ministère actif. Proposé ; le même texte que « Ministères » (T66, t187). */
    aucun: 'Aucun ministère actif.',
    /** Fraîcheur d'un ministère qui n'a jamais rien écrit. BRIEF règle 6. */
    aucuneSaisie: libelleFraicheur(null),
    /** Colonne « Prochain événement ». LISEZMOI, « Vide » (04, 12), sans point final en cellule. */
    aucunEvenement: 'Aucun événement prévu',
    /** Colonne « Prochaine réunion » (berger, conseil). BRIEF section 9 ; glossaire (T66, t188). */
    reunionNonRenseignee: 'Aucune date',
    /** Colonne « Point ouvert » (berger, conseil). BRIEF section 9. */
    aucunPointOuvert: 'Aucun',
  },
} as const
