import { phraseErreur } from '@/data/messagesBase'
import { TEXTES_VIDES } from '@/features/cette-semaine/textesVides'
import { MESSAGES_BASE_MODERATION } from '@/features/moderation/textes'

// Lecture d'un refus après « Marquer relu » ou « Masquer le texte » (T66), par la table de
// traduction de `src/data/messagesBase.ts` : un refus de la base prend sa phrase (« Ce texte a
// déjà été relu. Rechargez la page. », m220), un refus de droit (42501) dit que l'élément est
// introuvable, une connexion expirée ou un refus inattendu ont chacun leur phrase. Seule une
// erreur sans réponse est un problème de connexion (la fenêtre reste ouverte, le choix gardé).

/** Phrase d'un refus, à montrer sous les boutons de la ligne ou de la fenêtre. */
export function lireRefusModeration(erreur: unknown): string {
  return phraseErreur(
    erreur,
    { connexion: TEXTES_VIDES.page.erreur, acces: MESSAGES_BASE_MODERATION.acces },
    { formulaire: false },
  )
}
