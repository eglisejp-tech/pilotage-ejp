import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { lireRetraitEvenement, retirerEvenement } from '@/data/evenementsCorrections'
import { lireEvenementAMettreAJour, lireMentionsEvenement } from '@/data/evenementsEcriture'
import { lireMinisteres } from '@/data/ministeres'
import { enEchec, estIdentifiant } from '@/features/evenements/lectures'
import { nomDuMinistere, nomsDesMentions } from '@/features/evenements/mentions'
import { PanneauEvenement } from '@/features/evenements/PanneauEvenement'
import type { ContenuPanneauEvenement } from '@/features/evenements/PanneauEvenement'
import { useApresEcriture } from '@/features/evenements/useApresEcriture'
import { useFermerSaisie } from '@/features/evenements/useFermerSaisie'

interface Props {
  /** Identifiant de l'adresse (`/saisir/evenement/:id`), tel quel. */
  id: string | undefined
  /** Compte connecté, au-dessus du titre du panneau. */
  libelleCompte: string
}

/** Porteur absent de la liste (cas limite). */
const PORTEUR_SANS_NOM = 'Ministère inconnu'

/**
 * `/saisir/evenement/:id` pour EJP Tech (T78, Q7) : l'événement en lecture seule (nom, date,
 * statut, ministère porteur, mentions) et « Retirer l'événement », à tout moment, passé compris
 * (sur signalement du ministère). Un événement déjà retiré le dit, avec son jour. EJP Tech ne met
 * pas l'événement à jour (la base le refuse).
 */
export function SaisieConsultationEvenement({ id, libelleCompte }: Props) {
  const fermer = useFermerSaisie()
  const apresEcriture = useApresEcriture()
  const valide = estIdentifiant(id)
  const [retireALInstant, setRetireALInstant] = useState(false)
  const evenement = useQuery({
    queryKey: ['evenements', 'mise-a-jour', id],
    queryFn: () => lireEvenementAMettreAJour(id ?? ''),
    enabled: valide,
  })
  const mentions = useQuery({
    queryKey: ['evenements', 'mentions', id],
    queryFn: () => lireMentionsEvenement(id ?? ''),
    enabled: valide,
  })
  const ministeres = useQuery({
    queryKey: ['ministeres', 'liste'],
    queryFn: lireMinisteres,
    enabled: valide,
  })
  const retrait = useQuery({
    queryKey: ['evenements', 'retrait', id],
    queryFn: () => lireRetraitEvenement(id ?? ''),
    enabled: valide && evenement.data === null,
  })
  const reessayer = () => {
    void evenement.refetch()
    void mentions.refetch()
    void ministeres.refetch()
  }

  let contenu: ContenuPanneauEvenement
  if (retireALInstant) {
    contenu = { etat: 'retire', le: null, aLInstant: true, mode: 'consultation' }
  } else if (!valide) {
    contenu = { etat: 'introuvable', mode: 'consultation' }
  } else if (evenement.data === null) {
    if (retrait.data) {
      contenu = { etat: 'retire', le: retrait.data, aLInstant: false, mode: 'consultation' }
    } else if (retrait.data === null || retrait.isError) {
      contenu = { etat: 'introuvable', mode: 'consultation' }
    } else {
      contenu = { etat: 'chargement', mode: 'consultation' }
    }
  } else if (evenement.data && mentions.data && ministeres.data) {
    const lu = evenement.data
    contenu = {
      etat: 'consultation',
      evenementId: lu.id,
      titre: lu.titre,
      titrePrecedent: lu.titre_precedent ?? null,
      titreCorrigeLe: lu.titre_corrige_le ?? null,
      date: lu.date,
      statut: lu.statut,
      nomPorteur: nomDuMinistere(lu.ministere_id, ministeres.data) ?? PORTEUR_SANS_NOM,
      mentions: nomsDesMentions(
        mentions.data.map((mention) => mention.ministere_id),
        ministeres.data,
      ),
      retirer: async () => {
        try {
          await retirerEvenement(lu.id)
        } finally {
          apresEcriture()
        }
        setRetireALInstant(true)
      },
    }
  } else if (enEchec([evenement, mentions, ministeres])) {
    contenu = { etat: 'probleme', mode: 'consultation', reessayer }
  } else {
    contenu = { etat: 'chargement', mode: 'consultation' }
  }
  return <PanneauEvenement contenu={contenu} onFermer={fermer} surtitre={libelleCompte} />
}
