import { useQuery } from '@tanstack/react-query'
import { lireSemaine } from '@/data/eglise'
import { enregistrerReunion, lireProchaineReunion } from '@/data/reunions'
import { TEXTE_MASQUE } from '@/features/cette-semaine/textesVides'
import { enEchec } from '@/features/evenements/lectures'
import { PanneauReunion } from '@/features/evenements/PanneauReunion'
import type { ContenuPanneauReunion } from '@/features/evenements/PanneauReunion'
import type { Reunion, ValeursReunion } from '@/features/evenements/schemas'
import { useApresEcriture } from '@/features/evenements/useApresEcriture'
import { useFermerSaisie } from '@/features/evenements/useFermerSaisie'
import type { LigneVue } from '@/lib/base'

/**
 * Valeurs du formulaire « Modifier » à partir de la réunion déclarée : l'heure en HH:MM, un champ
 * vide pour un texte absent. Un texte masqué par EJP Tech ne se reprend pas : un nouvel envoi
 * l'écrirait comme un vrai texte.
 */
function valeursDe(reunion: LigneVue<'v_prochaine_reunion'>): ValeursReunion {
  const texte = (valeur: string | null) =>
    valeur === null || valeur === TEXTE_MASQUE ? '' : valeur
  return {
    date: reunion.date,
    heure: reunion.heure?.slice(0, 5) ?? '',
    objet: texte(reunion.objet),
    decision: texte(reunion.decision_attendue),
  }
}

/**
 * `/saisir/reunion` : lit le jour de Paris et la prochaine réunion déjà déclarée (« Modifier »
 * préremplit, « Renseigner » ouvre vide), puis ouvre le formulaire. Chaque envoi ajoute une
 * déclaration (règle 15).
 */
export function SaisieReunion({ ministereId }: { ministereId: string }) {
  const fermer = useFermerSaisie()
  const apresEcriture = useApresEcriture()
  const semaine = useQuery({ queryKey: ['eglise', 'semaine'], queryFn: lireSemaine })
  const prochaine = useQuery({
    queryKey: ['reunions', 'prochaine', ministereId],
    queryFn: () => lireProchaineReunion(ministereId),
  })

  const envoyer = async (reunion: Reunion) => {
    await enregistrerReunion(ministereId, reunion)
    apresEcriture()
  }

  let contenu: ContenuPanneauReunion
  if (semaine.data && prochaine.data !== undefined) {
    contenu = {
      etat: 'formulaire',
      aujourdhui: semaine.data.aujourdhui,
      prochaine: prochaine.data === null ? null : valeursDe(prochaine.data),
      envoyer,
    }
  } else if (enEchec([semaine, prochaine]) || semaine.data === null) {
    contenu = {
      etat: 'probleme',
      reessayer: () => {
        void semaine.refetch()
        void prochaine.refetch()
      },
    }
  } else {
    contenu = { etat: 'chargement' }
  }
  return <PanneauReunion contenu={contenu} onFermer={fermer} />
}
