import { Bouton } from '@/components/ui/Bouton'
import { TEXTE_MASQUE, TEXTE_MASQUE_AFFICHE } from '@/features/fiche/textesFiche'
import { ligneMentions, TEXTES_EVENEMENT } from '@/features/evenements/textes'
import { ligneAncienNom, TEXTES_CORRECTIONS } from '@/features/evenements/textesCorrections'
import { MessageReussite } from '@/features/saisie/MessageReussite'
import type { DateIso } from '@/lib/metier/dates'

interface Props {
  /** Nom en vigueur (`v_evenement.titre`). */
  titre: string
  /** Nom avant la dernière correction, et son jour (heure de Paris) ; null sans correction. */
  titrePrecedent: string | null
  titreCorrigeLe: DateIso | null
  /** Noms des ministères mentionnés en ce moment. */
  mentions: readonly string[]
  /** Faux après la date de l'événement : la raison remplace le bouton. */
  mentionsModifiables: boolean
  onCorrigerNom: () => void
  onModifierMentions: () => void
  /** « Nom corrigé. », « Mentions enregistrées. » après une correction, sinon null. */
  reussite: string | null
  /** Numéro de la correction réussie : deux de suite s'annoncent chacune. */
  envoi: number
}

/** Un nom masqué par EJP Tech s'écrit « [texte masqué] », comme partout. */
function nomAffiche(nom: string): string {
  return nom === TEXTE_MASQUE ? TEXTE_MASQUE_AFFICHE : nom
}

/**
 * En-tête du panneau « Mettre à jour l'événement » pour son porteur (T78, conception
 * calendrier-evenements.md, 8.2) : le nom et le lien « Corriger le nom », l'ancien nom sur une
 * ligne quand il a été corrigé (« Ancien nom : Soirée de lounge, corrigé le 26 oct. »), puis les
 * mentions et « Modifier les mentions ». Après la date de l'événement, la raison remplace le
 * bouton (une action impossible reste visible avec sa raison). Les deux boutons ouvrent leur
 * fenêtre ; la réussite se dit ici, six secondes.
 */
export function EnTeteCorrections({
  titre,
  titrePrecedent,
  titreCorrigeLe,
  mentions,
  mentionsModifiables,
  onCorrigerNom,
  onModifierMentions,
  reussite,
  envoi,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <p className="text-interface font-semibold">{TEXTES_EVENEMENT.libelleNom}</p>
        <div className="flex flex-wrap items-baseline gap-x-4">
          <p
            className={
              titre === TEXTE_MASQUE ? 'text-texte text-encre-3' : 'text-texte break-words'
            }
          >
            {nomAffiche(titre)}
          </p>
          <Bouton variante="lien" taille="lien" onClick={onCorrigerNom}>
            {TEXTES_CORRECTIONS.corrigerNom}
          </Bouton>
        </div>
        {titrePrecedent !== null ? (
          <p className="text-detail leading-normal text-encre-3">
            {ligneAncienNom(nomAffiche(titrePrecedent), titreCorrigeLe)}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col items-start gap-2">
        <p className="text-detail leading-normal text-encre-3">{ligneMentions(mentions)}</p>
        {mentionsModifiables ? (
          <Bouton taille="ligne-dense" onClick={onModifierMentions}>
            {TEXTES_CORRECTIONS.modifierMentions}
          </Bouton>
        ) : (
          <p className="text-detail leading-normal text-encre-2">
            {TEXTES_CORRECTIONS.mentionsFigees}
          </p>
        )}
      </div>
      <MessageReussite message={reussite} envoi={envoi} />
    </div>
  )
}
