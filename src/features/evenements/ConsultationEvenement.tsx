import { ligneMentions, libelleStatut, TEXTES_EVENEMENT } from '@/features/evenements/textes'
import { ligneAncienNom, TEXTES_CORRECTIONS } from '@/features/evenements/textesCorrections'
import { RetraitEvenement } from '@/features/evenements/RetraitEvenement'
import { TEXTE_MASQUE, TEXTE_MASQUE_AFFICHE } from '@/features/fiche/textesFiche'
import type { StatutEvenement } from '@/lib/base'
import { formaterJourAbrege } from '@/lib/metier/dates'
import type { DateIso } from '@/lib/metier/dates'

export interface ProprietesConsultationEvenement {
  /** Nom en vigueur. */
  titre: string
  titrePrecedent: string | null
  titreCorrigeLe: DateIso | null
  date: DateIso
  statut: StatutEvenement
  /** Ministère qui porte l'événement. */
  nomPorteur: string
  /** Noms des ministères mentionnés en ce moment. */
  mentions: readonly string[]
  /** Écrit le retrait ; le panneau dit ensuite que l'événement est retiré. */
  retirer: () => Promise<void>
}

/** Un nom masqué par EJP Tech s'écrit « [texte masqué] », comme partout. */
function nomAffiche(nom: string): string {
  return nom === TEXTE_MASQUE ? TEXTE_MASQUE_AFFICHE : nom
}

/**
 * Panneau d'un événement pour EJP Tech (T78, conception calendrier-evenements.md, 8.2) : en lecture
 * seule, le nom (et l'ancien nom s'il a été corrigé), la date, le statut, le ministère porteur et
 * les mentions, puis « Retirer l'événement », à tout moment (Q7 : un événement passé se retire par
 * EJP Tech, sur signalement du ministère). EJP Tech ne met pas l'événement à jour.
 */
export function ConsultationEvenement({
  titre,
  titrePrecedent,
  titreCorrigeLe,
  date,
  statut,
  nomPorteur,
  mentions,
  retirer,
}: ProprietesConsultationEvenement) {
  return (
    <div className="flex flex-col gap-5">
      <dl className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <dt className="text-interface font-semibold">{TEXTES_EVENEMENT.libelleNom}</dt>
          <dd className="text-texte break-words">{nomAffiche(titre)}</dd>
          {titrePrecedent !== null ? (
            <dd className="text-detail leading-normal text-encre-3">
              {ligneAncienNom(nomAffiche(titrePrecedent), titreCorrigeLe)}
            </dd>
          ) : null}
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-interface font-semibold">{TEXTES_CORRECTIONS.libelleDate}</dt>
          <dd className="text-texte">{formaterJourAbrege(date)}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-interface font-semibold">{TEXTES_CORRECTIONS.libelleStatut}</dt>
          <dd className="text-texte">{libelleStatut(statut)}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-interface font-semibold">{TEXTES_CORRECTIONS.libellePorteur}</dt>
          <dd className="text-texte">{nomPorteur}</dd>
          <dd className="text-detail leading-normal text-encre-3">{ligneMentions(mentions)}</dd>
        </div>
      </dl>
      <RetraitEvenement possible texte={TEXTES_CORRECTIONS.texteRetraitEjpTech} retirer={retirer} />
    </div>
  )
}
