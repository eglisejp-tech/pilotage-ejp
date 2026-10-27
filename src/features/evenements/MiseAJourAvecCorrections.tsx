import { useState } from 'react'
import { estEtatFinal } from '@/data/evenementsCorrections'
import type { EtatFinal } from '@/data/evenementsCorrections'
import type { MinistereListe } from '@/data/ministeres'
import { EnTeteCorrections } from '@/features/evenements/EnTeteCorrections'
import { FenetreMentionsEvenement } from '@/features/evenements/FenetreMentionsEvenement'
import { FenetreNomEvenement } from '@/features/evenements/FenetreNomEvenement'
import { FormulaireMiseAJourEvenement } from '@/features/evenements/FormulaireMiseAJourEvenement'
import type { ProprietesMiseAJourEvenement } from '@/features/evenements/FormulaireMiseAJourEvenement'
import { RetraitEvenement } from '@/features/evenements/RetraitEvenement'
import {
  raisonRetraitImpossible,
  TEXTES_CORRECTIONS,
} from '@/features/evenements/textesCorrections'
import { ligneSerie, porteeSerieAVenir, TEXTES_PLAGES } from '@/features/evenements/textesPlages'
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
  /**
   * Dernier état final (« Terminé » ou « Annulé ») enregistré, même remplacé depuis, ou null
   * (`lireEtatFinalEvenement`) : le porteur ne retire plus l'événement (27 octobre 2026).
   */
  etatFinal: EtatFinal | null
  corrigerNom: (titre: string) => Promise<void>
  modifierMentions: (mentions: string[]) => Promise<void>
  retirer: () => Promise<void>
  /** L'événement fait partie d'une série (T78, lot 2) : ses gestes « Toute la série ». */
  serie?: SerieDeLEvenement | null
}

/** Une série vue du panneau d'une de ses dates (T78, lot 2, conception 6.4 et 8.2). */
export interface SerieDeLEvenement {
  /** Dates non retirées de la série. */
  nombre: number
  /** Dates à venir (dernier jour compris) : celles dont les mentions changent. */
  aVenir: number
  /** Dates à venir sans état final : celles que le porteur retire. */
  retirables: number
  corrigerNom: (titre: string) => Promise<void>
  modifierMentions: (mentions: string[]) => Promise<void>
  retirer: () => Promise<void>
}

type Props = ProprietesMiseAJourEvenement & { corrections: CorrectionsEvenement }

/**
 * Panneau du porteur (dérivé de 11, `/saisir/evenement/:id` ; conception
 * calendrier-evenements.md, 8.2) : en tête le nom avec « Corriger le nom » et les mentions avec
 * « Modifier les mentions », puis le formulaire de mise à jour, et en bas le bouton discret
 * « Retirer l'événement ». Les mentions suivent la date de l'événement (heure de Paris,
 * `aujourdhui` de `v_semaine`) ; le retrait aussi, et s'arrête dès qu'un « Terminé » ou un
 * « Annulé » est enregistré (décision du 27 octobre 2026) : chacun dit alors sa raison, et le
 * lien « Signaler une difficulté » de la raison du retrait est le seul du panneau. Une seule
 * action qui attire l'œil : « Enregistrer la mise à jour ».
 */
export function MiseAJourAvecCorrections({ corrections, ...formulaire }: Props) {
  const [fenetre, setFenetre] = useState<'nom' | 'mentions' | null>(null)
  const [reussite, setReussite] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(0)
  // Jusqu'au dernier jour compris (T78, lot 2) ; un seul jour : sa date.
  const jusquALaDate =
    (formulaire.actuel.dateFin ?? formulaire.actuel.date) >= formulaire.aujourdhui
  const serie = corrections.serie ?? null
  // Le dernier état, s'il est final, est aussi le dernier état final enregistré ; sinon, la
  // lecture des états (un « Terminé » remplacé depuis compte encore, comme dans la base).
  const etatFinal = estEtatFinal(formulaire.actuel.statut)
    ? formulaire.actuel.statut
    : corrections.etatFinal
  const raisonRetrait = raisonRetraitImpossible(etatFinal, !jusquALaDate)
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
        lienSignalement={raisonRetrait === null}
        enTete={
          <>
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
            {serie ? (
              <p className="text-detail leading-normal text-encre-2">{ligneSerie(serie.nombre)}</p>
            ) : null}
          </>
        }
      />
      <RetraitEvenement
        raison={raisonRetrait}
        texte={TEXTES_CORRECTIONS.texteRetrait}
        retirer={corrections.retirer}
        serie={
          serie && serie.retirables > 0
            ? {
                nombre: serie.nombre,
                libelle: porteeSerieAVenir(serie.retirables),
                envoyer: serie.retirer,
              }
            : undefined
        }
      />
      {fenetre === 'nom' ? (
        <FenetreNomEvenement
          nom={nom}
          envoyer={corrections.corrigerNom}
          onReussite={() => reussir(TEXTES_CORRECTIONS.reussiteNom)}
          onFermer={() => setFenetre(null)}
          serie={
            serie
              ? {
                  nombre: serie.nombre,
                  libelle: TEXTES_PLAGES.porteeSerie,
                  envoyer: serie.corrigerNom,
                }
              : undefined
          }
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
          serie={
            serie && serie.aVenir > 0
              ? {
                  nombre: serie.nombre,
                  libelle: porteeSerieAVenir(serie.aVenir),
                  envoyer: serie.modifierMentions,
                }
              : undefined
          }
        />
      ) : null}
    </div>
  )
}
