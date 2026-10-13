// Écritures de la configuration des indicateurs (étape 6, lot L3b ; configuration-indicateurs.md,
// 5.8, 6.1 et 7.2) : ajouter, remplacer, calculer, corriger et retirer, pour l'administration de
// l'église et EJP Tech. Une fonction typée par appel ; les schémas Zod sont ceux des formulaires
// (CLAUDE.md : une validation partagée). Les bornes sont celles de la base, qui reste l'autorité :
// le schéma évite l'aller-retour, il ne remplace aucun contrôle. Les fonctions de la base sont
// `security invoker` et ouvertes à `authenticated` seulement ; aucun texte libre ne va au journal.

import { z } from 'zod'
import { traduireMessageBase } from '@/data/messagesBase'
import type {
  LigneTable,
  LimitesIndicateurs,
  MotifRetraitChoisi,
  NatureIndicateur,
  VerificationLibelle,
} from '@/lib/base'
import { longueurEnCaracteres } from '@/lib/metier/texte'
import { supabase } from '@/lib/supabase'

/**
 * Messages des contrôles (5.8, 6.1) : le même texte avant l'appel et après, quand la table de
 * traduction (`src/data/messagesBase.ts`) dit le refus de la base. `libelle`, `definition`,
 * `sorte` et `distincts` sont proposés (m233) : les mots des champs, sans « libellé » ni
 * « sorte ».
 */
export const MESSAGES_ECRITURE = {
  libelle: 'Donnez un nom de 2 à 60 caractères.',
  definition: 'Expliquez ce qui est compté, en 10 à 140 caractères.',
  rythme: 'Choisissez le rythme : chaque dimanche, chaque mois ou à ce jour.',
  sorte: 'Choisissez le type de nombre.',
  sensibleMois: 'Un indicateur sensible se saisit chaque mois.',
  sensibleCompte: "Un indicateur sensible est un compte, jusqu'à 9 999.",
  type: 'Choisissez un taux ou une moyenne.',
  haut: 'Choisissez le chiffre du haut.',
  bas: 'Choisissez le chiffre du bas.',
  distincts: 'Choisissez deux chiffres différents du même ministère.',
  partTaux: 'Seul un taux peut être une part.',
  motif: 'Choisissez le motif du retrait.',
} as const

export const LONGUEUR_LIBELLE_MAX = 60
export const LONGUEUR_DEFINITION_MAX = 140

/** Espaces réduits et retirés aux bords, comme la base avant de compter les caractères. */
export function compacter(texte: string): string {
  return texte.replace(/\s+/g, ' ').trim()
}

function texteEntre(min: number, max: number, message: string) {
  return z
    .string()
    .transform(compacter)
    .refine((texte) => {
      const longueur = longueurEnCaracteres(texte)
      return longueur >= min && longueur <= max
    }, message)
}

const schemaLibelle = texteEntre(2, LONGUEUR_LIBELLE_MAX, MESSAGES_ECRITURE.libelle)
const schemaDefinition = texteEntre(10, LONGUEUR_DEFINITION_MAX, MESSAGES_ECRITURE.definition)

export const NATURES_CHOISIES = ['dimanche', 'mois', 'a_ce_jour'] as const
/** Les trois sortes de nombre qu'un panneau propose (configuration-indicateurs.md, 3.2). */
export const UNITES_CHOISIES = ['nombre', 'grand_nombre', 'euros'] as const
/**
 * Les deux sortes qu'un panneau ne propose jamais à l'ajout, mais que la base accepte : le
 * remplaçant d'une heure ou d'un nombre de jours garde la sorte de l'ancien indicateur, sans quoi
 * une heure (0 à 1 439 minutes) deviendrait un compte.
 */
export const UNITES_GARDEES = ['heure', 'jours'] as const
const UNITES_ACCEPTEES = [...UNITES_CHOISIES, ...UNITES_GARDEES] as const

/** Un libellé et une définition : la correction d'un indicateur. */
export const schemaCorrection = z.object({
  libelle: schemaLibelle,
  definition: schemaDefinition,
})
export type EntreeCorrection = z.input<typeof schemaCorrection>
export type Correction = z.output<typeof schemaCorrection>

/** Ajout (ou remplacement) d'un indicateur saisi, par l'administration ou EJP Tech. */
export const schemaAjout = z
  .object({
    libelle: schemaLibelle,
    definition: schemaDefinition,
    nature: z.enum(NATURES_CHOISIES, { error: MESSAGES_ECRITURE.rythme }),
    unite: z.enum(UNITES_ACCEPTEES, { error: MESSAGES_ECRITURE.sorte }),
    sensible: z.boolean(),
    pasSensible: z.boolean(),
  })
  .superRefine((ajout, contexte) => {
    if (!ajout.sensible) return
    if (ajout.nature !== 'mois') {
      contexte.addIssue({
        code: 'custom',
        path: ['nature'],
        message: MESSAGES_ECRITURE.sensibleMois,
      })
    }
    if (ajout.unite !== 'nombre') {
      contexte.addIssue({
        code: 'custom',
        path: ['unite'],
        message: MESSAGES_ECRITURE.sensibleCompte,
      })
    }
  })
export type EntreeAjout = z.input<typeof schemaAjout>
export type Ajout = z.output<typeof schemaAjout>

/** Ajout (ou remplacement) d'un calcul : un taux ou une moyenne de deux indicateurs saisis. */
export const schemaCalcul = z
  .object({
    libelle: schemaLibelle,
    definition: schemaDefinition,
    type: z.enum(['taux', 'moyenne'], { error: MESSAGES_ECRITURE.type }),
    hautId: z.uuid({ error: MESSAGES_ECRITURE.haut }),
    basId: z.uuid({ error: MESSAGES_ECRITURE.bas }),
    /**
     * P49 : un taux qui est une part ne dépasse jamais 100 %. Posée à la création, jamais modifiée
     * ensuite. Omise (le remplacement d'un calcul), la base reprend celle du calcul remplacé.
     */
    part: z.boolean().optional(),
  })
  .superRefine((calcul, contexte) => {
    if (calcul.hautId === calcul.basId) {
      contexte.addIssue({ code: 'custom', path: ['basId'], message: MESSAGES_ECRITURE.distincts })
    }
    if (calcul.part === true && calcul.type !== 'taux') {
      contexte.addIssue({ code: 'custom', path: ['part'], message: MESSAGES_ECRITURE.partTaux })
    }
  })
export type EntreeCalcul = z.input<typeof schemaCalcul>
export type Calcul = z.output<typeof schemaCalcul>

/** Motifs de retrait qu'un écran envoie (liste fermée de 4.6), avec leur libellé à l'écran. */
export const MOTIFS_RETRAIT: ReadonlyArray<{ code: MotifRetraitChoisi; libelle: string }> = [
  { code: 'plus_suivi', libelle: "N'est plus suivi" },
  { code: 'doublon', libelle: "Doublon d'un autre chiffre" },
  { code: 'erreur', libelle: 'Créé par erreur' },
  { code: 'se_calcule', libelle: "Se calcule à partir d'autres chiffres" },
  { code: 'deja_commun', libelle: 'Déjà compté par un chiffre commun' },
  { code: 'domaine_sensible', libelle: "Domaine sensible : à créer par l'administration" },
  { code: 'hors_regles', libelle: "Hors des règles de l'outil" },
]

export const schemaMotifRetrait = z.enum(
  MOTIFS_RETRAIT.map((motif) => motif.code) as [MotifRetraitChoisi, ...MotifRetraitChoisi[]],
  { error: MESSAGES_ECRITURE.motif },
)

const schemaIdentifiant = z.uuid()

/**
 * Ajoute un indicateur saisi sur la fiche d'un ministère (`creer_indicateur`). Avec `remplaceId`,
 * l'ancien est retiré dans la même transaction (motif « Remplacé ») et ses saisies restent sous lui.
 * Rend l'identifiant du nouvel indicateur.
 */
export async function ajouterIndicateur(
  ministereId: string,
  entree: EntreeAjout,
  remplaceId: string | null = null,
): Promise<string> {
  const ajout = schemaAjout.parse(entree)
  const { data, error } = await supabase().rpc('creer_indicateur', {
    p_ministere_id: schemaIdentifiant.parse(ministereId),
    p_libelle: ajout.libelle,
    p_definition: ajout.definition,
    p_nature: ajout.nature,
    p_unite: ajout.sensible ? 'nombre' : ajout.unite,
    p_sensible: ajout.sensible,
    p_pas_sensible: ajout.pasSensible && !ajout.sensible,
    p_remplace_id: remplaceId === null ? null : schemaIdentifiant.parse(remplaceId),
  })
  if (error) throw error
  return data
}

/**
 * Ajoute un calcul (`creer_calcul`) : le rythme et l'unité viennent du chiffre du haut, la base
 * contrôle que les deux sources se calculent ensemble. Avec `remplaceId`, l'ancien calcul est retiré
 * dans la même transaction. Rend l'identifiant du calcul.
 */
export async function ajouterCalcul(
  entree: EntreeCalcul,
  remplaceId: string | null = null,
): Promise<string> {
  const calcul = schemaCalcul.parse(entree)
  const { data, error } = await supabase().rpc('creer_calcul', {
    p_libelle: calcul.libelle,
    p_definition: calcul.definition,
    p_type: calcul.type,
    p_haut_id: calcul.hautId,
    p_bas_id: calcul.basId,
    p_remplace_id: remplaceId === null ? null : schemaIdentifiant.parse(remplaceId),
    p_part: calcul.part ?? null,
  })
  if (error) throw error
  return data
}

/**
 * Corrige le libellé et la définition (`corriger_indicateur`), tant qu'aucune valeur n'est saisie
 * (pour un calcul : aucune valeur de ses sources). Jamais une suggestion.
 */
export async function corrigerIndicateur(
  indicateurId: string,
  entree: EntreeCorrection,
): Promise<void> {
  const correction = schemaCorrection.parse(entree)
  const { error } = await supabase().rpc('corriger_indicateur', {
    p_indicateur_id: schemaIdentifiant.parse(indicateurId),
    p_libelle: correction.libelle,
    p_definition: correction.definition,
  })
  if (error) throw error
}

/**
 * Retire un indicateur avec un motif (`retirer_indicateur`). Ses saisies restent ; un calcul qui en
 * dépend est retiré avec lui. Avec le motif « confidentialité », le libellé et la définition sont
 * aussi masqués. Rend le nombre de calculs retirés avec lui.
 */
export async function retirerIndicateur(
  indicateurId: string,
  motif: MotifRetraitChoisi | 'confidentialite',
): Promise<number> {
  const choisi = motif === 'confidentialite' ? motif : schemaMotifRetrait.parse(motif)
  const { data, error } = await supabase().rpc('retirer_indicateur', {
    p_indicateur_id: schemaIdentifiant.parse(indicateurId),
    p_motif: choisi,
  })
  if (error) throw error
  return data
}

/**
 * Contrôles d'un libellé pendant la frappe (`verifier_libelle`) : ce que la base refuserait, et le
 * doublon éventuel. Un appel en POST : la fonction est volatile. Chaque message prend la phrase de
 * la table de traduction, la même que celle du refus à l'envoi (m233).
 */
export async function verifierLibelle(
  libelle: string,
  nature: NatureIndicateur,
  ministereId: string,
): Promise<VerificationLibelle[]> {
  const { data, error } = await supabase().rpc('verifier_libelle', {
    p_libelle: libelle,
    p_nature: nature,
    p_ministere_id: schemaIdentifiant.parse(ministereId),
  })
  if (error) throw error
  return data.map((ligne) => ({ ...ligne, message: traduireMessageBase(ligne.message) }))
}

/** Limites d'une fiche (`limites_indicateurs`) : lignes suivies et plafond, ajouts et plafond. */
export async function lireLimites(ministereId: string): Promise<LimitesIndicateurs> {
  const { data, error } = await supabase().rpc('limites_indicateurs', {
    p_ministere_id: schemaIdentifiant.parse(ministereId),
  })
  if (error) throw error
  const limites = data[0]
  if (limites === undefined) throw new Error('Limites absentes.')
  return limites
}

/** Un terme d'un calcul : le calcul, sa source et le rôle de la source (haut ou bas). */
export type LigneTerme = Pick<LigneTable<'indicateur_terme'>, 'calcul_id' | 'source_id' | 'role'>

/** Termes d'un calcul (`calculId`) ou calculs qui se servent d'une source (`sourceId`). */
export type FiltreTermes = { calculId: string } | { sourceId: string }

/** Lit les termes d'un calcul, ou les calculs qui dépendent d'un indicateur (un seul filtre). */
export async function lireTermes(filtre: FiltreTermes): Promise<LigneTerme[]> {
  const requete = supabase().from('indicateur_terme').select('calcul_id, source_id, role')
  const { data, error } =
    'calculId' in filtre
      ? await requete.eq('calcul_id', schemaIdentifiant.parse(filtre.calculId))
      : await requete.eq('source_id', schemaIdentifiant.parse(filtre.sourceId))
  if (error) throw error
  return data
}
