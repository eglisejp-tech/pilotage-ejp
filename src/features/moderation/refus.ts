import { phraseErreur } from '@/data/echecEnvoi'
import { TEXTES_VIDES } from '@/features/cette-semaine/textesVides'

// Lecture d'un refus après « Marquer relu » ou « Masquer le texte » (T66), par le classement
// unique de `src/data/echecEnvoi.ts` (T76) : un refus de la base prend sa phrase (« Ce texte a
// déjà été relu. Rechargez la page. », m220), un refus de droit (42501) dit que l'élément est
// introuvable, une connexion expirée, un refus inattendu ou un bogue ont chacun leur phrase. Un
// échec technique dit la phrase de connexion (la fenêtre reste ouverte, le choix gardé).

/** Phrase d'un refus, à montrer sous les boutons de la ligne ou de la fenêtre. */
export function lireRefusModeration(erreur: unknown): string {
  return phraseErreur(erreur, { connexion: TEXTES_VIDES.page.erreur }, { formulaire: false })
}
