import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  corrigerNomEvenement,
  corrigerNomSerie,
  estEtatFinal,
  lireDatesSerie,
  lireEtatFinalEvenement,
  lireRetraitEvenement,
  modifierMentionsEvenement,
  modifierMentionsSerie,
  retirerEvenement,
  retirerSerie,
} from '@/data/evenementsCorrections'
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
 * les noms des ministères, puis ouvre le formulaire de mise à jour, avec les corrections du
 * porteur (T78 : nom, mentions, retrait). Un identifiant qui n'en est pas un donne « Cet
 * événement est introuvable. » sans aucune requête ; un événement illisible aussi ; un événement
 * retiré dit « Cet événement a été retiré le 26 oct. » ; un ministère mentionné lit « Seul
 * Communication peut modifier cet événement. ». Seul le porteur écrit (la base refuse les autres).
 */
export function SaisieMiseAJourEvenement({ id, ministereId, libelleCompte }: Props) {
  const fermer = useFermerSaisie()
  const apresEcriture = useApresEcriture()
  const valide = estIdentifiant(id)
  // Le retrait vient de réussir dans ce panneau : il le dit, avant toute relecture.
  const [retireALInstant, setRetireALInstant] = useState(false)
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
  // Un « Terminé » ou un « Annulé » déjà enregistré : le porteur ne retire plus (27 oct. 2026).
  const etatFinal = useQuery({
    queryKey: ['evenements', 'etat-final', id],
    queryFn: () => lireEtatFinalEvenement(id ?? ''),
    enabled: valide && porteur,
  })
  const ministeres = useQuery({
    queryKey: ['ministeres', 'liste'],
    queryFn: lireMinisteres,
    enabled: valide,
  })
  // Une date d'une série (T78, lot 2) : les dates de la série, pour « Toute la série ».
  const serieId = evenement.data?.serie_id ?? null
  const datesSerie = useQuery({
    queryKey: ['evenements', 'serie', serieId],
    queryFn: () => lireDatesSerie(serieId ?? ''),
    enabled: valide && porteur && serieId !== null,
  })
  // Un événement absent de v_evenement a peut-être été retiré (T78) : un ancien lien le dit.
  const retrait = useQuery({
    queryKey: ['evenements', 'retrait', id],
    queryFn: () => lireRetraitEvenement(id ?? ''),
    enabled: valide && evenement.data === null,
  })

  /** Une écriture, puis la relecture de la page, même après un échec (réponse perdue, T76). */
  const ecrire = async (ecriture: () => Promise<void>) => {
    try {
      await ecriture()
    } finally {
      apresEcriture()
    }
  }
  const envoyer = async (miseAJour: MiseAJourEvenement) => {
    await mettreAJourEvenement(id ?? '', miseAJour)
    apresEcriture()
  }
  const reessayer = () => {
    void semaine.refetch()
    void evenement.refetch()
    void ministeres.refetch()
    if (porteur) {
      void mentions.refetch()
      void etatFinal.refetch()
      if (serieId !== null) void datesSerie.refetch()
    }
  }
  // Le porteur attend aussi les mentions ; un ministère mentionné n'a que le message à lire.

  let contenu: ContenuPanneauEvenement
  if (retireALInstant) {
    contenu = { etat: 'retire', le: null, aLInstant: true, mode: 'mise_a_jour' }
  } else if (!valide) {
    contenu = { etat: 'introuvable' }
  } else if (evenement.data === null) {
    if (retrait.data) {
      contenu = { etat: 'retire', le: retrait.data, aLInstant: false, mode: 'mise_a_jour' }
    } else if (retrait.data === null || retrait.isError) {
      contenu = { etat: 'introuvable' }
    } else {
      contenu = { etat: 'chargement', mode: 'mise_a_jour' }
    }
  } else if (evenement.data && !porteur && ministeres.data) {
    contenu = {
      etat: 'pas_porteur',
      nomPorteur: nomDuMinistere(evenement.data.ministere_id, ministeres.data) ?? PORTEUR_SANS_NOM,
    }
  } else if (
    evenement.data &&
    semaine.data &&
    ministeres.data &&
    mentions.data &&
    etatFinal.isSuccess &&
    (serieId === null || datesSerie.data)
  ) {
    const lu = evenement.data
    const idsMentions = mentions.data.map((mention) => mention.ministere_id)
    const dates = datesSerie.data ?? []
    contenu = {
      etat: 'mise_a_jour',
      evenementId: lu.id,
      aujourdhui: semaine.data.aujourdhui,
      titre: lu.titre,
      mentions: nomsDesMentions(idsMentions, ministeres.data),
      actuel: {
        date: lu.date,
        statut: lu.statut,
        heurePrevue: lu.heure_prevue,
        heureDebut: lu.heure_debut,
        dateFin: lu.date_fin,
        heureFin: lu.heure_fin,
        aConfirmer: lu.a_confirmer,
      },
      envoyer,
      corrections: {
        titrePrecedent: lu.titre_precedent ?? null,
        titreCorrigeLe: lu.titre_corrige_le ?? null,
        porteurId: lu.ministere_id,
        mentionIds: idsMentions,
        ministeres: ministeres.data,
        etatFinal: etatFinal.data,
        corrigerNom: (titre) => ecrire(() => corrigerNomEvenement(lu.id, titre)),
        modifierMentions: (liste) => ecrire(() => modifierMentionsEvenement(lu.id, liste)),
        retirer: async () => {
          await ecrire(() => retirerEvenement(lu.id))
          setRetireALInstant(true)
        },
        serie:
          serieId === null
            ? null
            : {
                nombre: dates.length,
                aVenir: dates.filter((date) => date.jours_fin >= 0).length,
                retirables: dates.filter(
                  (date) => date.jours_fin >= 0 && !estEtatFinal(date.statut),
                ).length,
                corrigerNom: (titre) => ecrire(() => corrigerNomSerie(serieId, titre)),
                modifierMentions: (liste) => ecrire(() => modifierMentionsSerie(serieId, liste)),
                retirer: async () => {
                  await ecrire(() => retirerSerie(serieId))
                  setRetireALInstant(true)
                },
              },
      },
    }
  } else if (
    enEchec([
      semaine,
      evenement,
      ministeres,
      mentions,
      etatFinal,
      ...(serieId === null ? [] : [datesSerie]),
    ]) ||
    semaine.data === null
  ) {
    contenu = { etat: 'probleme', mode: 'mise_a_jour', reessayer }
  } else {
    contenu = { etat: 'chargement', mode: 'mise_a_jour' }
  }
  return <PanneauEvenement contenu={contenu} onFermer={fermer} surtitre={libelleCompte} />
}
