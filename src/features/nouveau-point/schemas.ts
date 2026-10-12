import { z } from 'zod'
import { MESSAGES_POINT, schemaBaseNouveauPoint } from '@/data/pointsEcriture'
import type { NouveauPoint } from '@/data/pointsEcriture'
import { estDateIso } from '@/lib/metier/dates'
import type { DateIso } from '@/lib/metier/dates'

// Schéma du formulaire « Nouveau point d'attention » (CLAUDE.md : validation Zod partagée). Il
// reprend champ par champ le schéma de base de `src/data/pointsEcriture.ts`, celui que
// `creerPoint` applique à chaque appel, et ajoute ce que seul le formulaire sait : l'échéance se
// saisit comme une chaîne (vide pour « sans échéance ») et ne peut pas précéder `aujourdhui`, et
// le ministère du compte ne se mentionne jamais. « Aujourd'hui » vient de `v_semaine.aujourdhui`
// (heure de Paris), jamais de la date du navigateur ; la base reste la garde.

/** Échéance d'un formulaire : vide (null), ou un jour valide qui n'est pas passé. */
function champEcheance(aujourdhui: DateIso) {
  return z
    .string()
    .superRefine((valeur, contexte) => {
      if (valeur === '') return
      if (!estDateIso(valeur)) {
        contexte.addIssue({ code: 'custom', message: MESSAGES_POINT.refus.echeanceFormat })
      } else if (valeur < aujourdhui) {
        contexte.addIssue({ code: 'custom', message: MESSAGES_POINT.refus.echeancePassee })
      }
    })
    .transform((valeur) => (valeur === '' ? null : valeur))
    .pipe(schemaBaseNouveauPoint.shape.echeance)
}

/** Nouveau point (maquette 10) : `ministereId` est celui du compte, jamais mentionné. */
export function schemaFormulairePoint(contexte: { aujourdhui: DateIso; ministereId: string }) {
  const base = schemaBaseNouveauPoint.shape
  return z.object({
    titre: base.titre,
    description: base.description,
    priorite: base.priorite,
    attendu: base.attendu,
    echeance: champEcheance(contexte.aujourdhui),
    mentions: base.mentions.refine(
      (ids) => !ids.includes(contexte.ministereId),
      MESSAGES_POINT.refus.mentionRefusee,
    ),
  })
}

/** Les champs tels qu'ils sont saisis (textes et échéance en chaînes). */
export type ValeursFormulairePoint = z.input<ReturnType<typeof schemaFormulairePoint>>
export type { NouveauPoint }
