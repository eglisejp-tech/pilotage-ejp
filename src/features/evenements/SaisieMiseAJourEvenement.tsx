import { useQuery } from '@tanstack/react-query'
import {
  lireEvenementAMettreAJour,
  lireMentionsEvenement,
  mettreAJourEvenement,
} from '@/data/evenementsEcriture'
import { lireSemaine } from '@/data/eglise'
import { lireMinisteres } from '@/data/ministeres'
import { enEchec, estIdentifiant } from '@/features/evenements/lectures'
import { nomDuMinistere, nomsDesMentions } from '@/features/evenements/mentions'
import { PanneauEvenement } from '@/features/evenements/PanneauEvenement'
import type { ContenuPanneauEvenement } from '@/features/evenements/PanneauEvenement'
import type { MiseAJourEvenement } from '@/features/evenements/schemas'
import { useApresEcriture } from '@/features/evenements/useApresEcriture'
import { useFermerSaisie } from '@/features/evenements/useFermerSaisie'

interface Props {
  /** Identifiant de l'adresse (`/saisir/evenement/:id`), tel quel. */
  id: string | undefined
  ministereId: string
  /** Compte connecté, au-dessus du titre du panneau. */
  libelleCompte: string
}

/** Porteur absent de la liste (cas limite) : la phrase reste juste, sans nom. */
const PORTEUR_SANS_NOM = 'le ministère qui le porte'

/**
 * `/saisir/evenement/:id` : lit le jour de Paris, le dernier état de l'événement, ses mentions et
 * les noms des ministères, puis ouvre le formulaire de mise à jour. Un identifiant qui n'en est
 * pas un donne « Cet élément n'existe pas ou vous n'y avez pas accès. » sans aucune requête ; un
 * événement illisible aussi ; un ministère mentionné lit « Seul Communication met à jour cet
 * événement. ». Seul le porteur envoie une ligne d'état (la RLS refuse les autres).
 */
export function SaisieMiseAJourEvenement({ id, ministereId, libelleCompte }: Props) {
  const fermer = useFermerSaisie()
  const apresEcriture = useApresEcriture()
  const valide = estIdentifiant(id)
  const semaine = useQuery({
    queryKey: ['eglise', 'semaine'],
    queryFn: lireSemaine,
    enabled: valide,
  })
  const evenement = useQuery({
    queryKey: ['evenements', 'mise-a-jour', id],
    queryFn: () => lireEvenementAMettreAJour(id ?? ''),
    enabled: valide,
  })
  const porteur = evenement.data?.ministere_id === ministereId
  const mentions = useQuery({
    queryKey: ['evenements', 'mentions', id],
    queryFn: () => lireMentionsEvenement(id ?? ''),
    enabled: valide && porteur,
  })
  const ministeres = useQuery({
    queryKey: ['ministeres', 'liste'],
    queryFn: lireMinisteres,
    enabled: valide,
  })

  const envoyer = async (miseAJour: MiseAJourEvenement) => {
    await mettreAJourEvenement(id ?? '', miseAJour)
    apresEcriture()
  }
  const reessayer = () => {
    void semaine.refetch()
    void evenement.refetch()
    void ministeres.refetch()
    if (porteur) void mentions.refetch()
  }
  // Le porteur attend aussi les mentions ; un ministère mentionné n'a que le message à lire.

  let contenu: ContenuPanneauEvenement
  if (!valide || evenement.data === null) {
    contenu = { etat: 'introuvable' }
  } else if (evenement.data && !porteur && ministeres.data) {
    contenu = {
      etat: 'pas_porteur',
      nomPorteur: nomDuMinistere(evenement.data.ministere_id, ministeres.data) ?? PORTEUR_SANS_NOM,
    }
  } else if (evenement.data && semaine.data && ministeres.data && mentions.data) {
    contenu = {
      etat: 'mise_a_jour',
      evenementId: evenement.data.id,
      aujourdhui: semaine.data.aujourdhui,
      titre: evenement.data.titre,
      mentions: nomsDesMentions(
        mentions.data.map((mention) => mention.ministere_id),
        ministeres.data,
      ),
      actuel: {
        date: evenement.data.date,
        statut: evenement.data.statut,
        aConfirmer: evenement.data.a_confirmer,
      },
      envoyer,
    }
  } else if (enEchec([semaine, evenement, ministeres, mentions]) || semaine.data === null) {
    contenu = { etat: 'probleme', mode: 'mise_a_jour', reessayer }
  } else {
    contenu = { etat: 'chargement', mode: 'mise_a_jour' }
  }
  return <PanneauEvenement contenu={contenu} onFermer={fermer} surtitre={libelleCompte} />
}
