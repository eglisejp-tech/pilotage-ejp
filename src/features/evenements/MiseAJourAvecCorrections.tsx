import { useState } from 'react'
import type { MinistereListe } from '@/data/ministeres'
import { EnTeteCorrections } from '@/features/evenements/EnTeteCorrections'
import { FenetreMentionsEvenement } from '@/features/evenements/FenetreMentionsEvenement'
import { FenetreNomEvenement } from '@/features/evenements/FenetreNomEvenement'
import { FormulaireMiseAJourEvenement } from '@/features/evenements/FormulaireMiseAJourEvenement'
import type { ProprietesMiseAJourEvenement } from '@/features/evenements/FormulaireMiseAJourEvenement'
import { RetraitEvenement } from '@/features/evenements/RetraitEvenement'
import { TEXTES_CORRECTIONS } from '@/features/evenements/textesCorrections'
import { TEXTE_MASQUE } from '@/features/fiche/textesFiche'
import type { DateIso } from '@/lib/metier/dates'

/** Ce que le porteur corrige sur son événement (T78, lot 1), lu et écrit par la page. */
export interface CorrectionsEvenement {
  /** Nom avant la dernière correction et son jour (heure de Paris), ou null. */
  titrePrecedent: string | null
  titreCorrigeLe: DateIso | null
  /** Ministère porteur : il ne se mentionne pas lui-même. */
  porteurId: string
  /** Identifiants des ministères mentionnés en ce moment (`v_evenement_mention`). */
  mentionIds: readonly string[]
  /** Tous les ministères, désactivés compris. */
  ministeres: readonly MinistereListe[]
  corrigerNom: (titre: string) => Promise<void>
  modifierMentions: (mentions: string[]) => Promise<void>
  retirer: () => Promise<void>
}

type Props = ProprietesMiseAJourEvenement & { corrections: CorrectionsEvenement }

/**
 * Panneau du porteur (dérivé de 11, `/saisir/evenement/:id` ; conception
 * calendrier-evenements.md, 8.2) : en tête le nom avec « Corriger le nom » et les mentions avec
 * « Modifier les mentions », puis le formulaire de mise à jour, et en bas le bouton discret
 * « Retirer l'événement ». Les mentions et le retrait suivent la date de l'événement (heure de
 * Paris, `aujourdhui` de `v_semaine`) : après elle, chacun dit sa raison. Une seule action qui
 * attire l'œil : « Enregistrer la mise à jour ».
 */
export function MiseAJourAvecCorrections({ corrections, ...formulaire }: Props) {
  const [fenetre, setFenetre] = useState<'nom' | 'mentions' | null>(null)
  const [reussite, setReussite] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(0)
  const jusquALaDate = formulaire.actuel.date >= formulaire.aujourdhui
  const nom = { texte: formulaire.titre, masque: formulaire.titre === TEXTE_MASQUE }

  const reussir = (message: string) => {
    setFenetre(null)
    setReussite(message)
    setEnvoi((precedent) => precedent + 1)
  }

  return (
    <div className="flex flex-col gap-5">
      <FormulaireMiseAJourEvenement
        {...formulaire}
        enTete={
          <EnTeteCorrections
            titre={formulaire.titre}
            titrePrecedent={corrections.titrePrecedent}
            titreCorrigeLe={corrections.titreCorrigeLe}
            mentions={formulaire.mentions}
            mentionsModifiables={jusquALaDate}
            onCorrigerNom={() => setFenetre('nom')}
            onModifierMentions={() => setFenetre('mentions')}
            reussite={reussite}
            envoi={envoi}
          />
        }
      />
      <RetraitEvenement
        possible={jusquALaDate}
        texte={TEXTES_CORRECTIONS.texteRetrait}
        retirer={corrections.retirer}
      />
      {fenetre === 'nom' ? (
        <FenetreNomEvenement
          nom={nom}
          envoyer={corrections.corrigerNom}
          onReussite={() => reussir(TEXTES_CORRECTIONS.reussiteNom)}
          onFermer={() => setFenetre(null)}
        />
      ) : null}
      {fenetre === 'mentions' ? (
        <FenetreMentionsEvenement
          nom={nom}
          porteurId={corrections.porteurId}
          mentions={corrections.mentionIds}
          ministeres={corrections.ministeres}
          envoyer={corrections.modifierMentions}
          onReussite={() => reussir(TEXTES_CORRECTIONS.reussiteMentions)}
          onFermer={() => setFenetre(null)}
        />
      ) : null}
    </div>
  )
}
