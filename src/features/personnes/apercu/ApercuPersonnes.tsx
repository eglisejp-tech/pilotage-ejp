import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  connexionsAffichees,
  nombreAEffacer,
  personnesActives,
  personnesSansActivite,
} from '@/features/personnes/construirePersonnes'
import {
  CONNEXIONS_EXEMPLE,
  LIBELLES_EXEMPLE,
  PERSONNES_EXEMPLE,
} from '@/features/personnes/apercu/exemplesPersonnes'
import type { ActionsPersonnes, ResultatPersonnes } from '@/features/personnes/usePersonnes'
import { VuePersonnes } from '@/features/personnes/VuePersonnes'
import { PRENOM_EFFACE } from '@/lib/metier/declaration'

const TAILLE = 50

/**
 * Aperçu de développement de l'onglet « Personnes » d'EJP Tech (T56), sans base : les vrais
 * composants nourris des exemples. Adresse : /apercu/personnes?profil=admin_plateforme. `?etat=`
 * : `liste` (par défaut), `vide`, `chargement`, `erreur`. Les effacements sont simulés en mémoire.
 */
export function ApercuPersonnes() {
  const [parametres] = useSearchParams()
  const etat = parametres.get('etat') ?? 'liste'
  const [personnes, setPersonnes] = useState(PERSONNES_EXEMPLE)
  const [limite, setLimite] = useState(TAILLE)

  const resultat = useMemo<ResultatPersonnes>(() => {
    if (etat === 'chargement') return { etat: 'chargement' }
    if (etat === 'erreur') return { etat: 'erreur', reessayer: () => undefined }
    const vide = etat === 'vide'
    const lues = vide ? [] : personnes
    const connexions = vide ? [] : CONNEXIONS_EXEMPLE.slice(0, limite)
    return {
      etat: 'pret',
      donnees: {
        actives: personnesActives(lues),
        sansActivite: personnesSansActivite(lues),
        aEffacer: nombreAEffacer(lues),
        connexions: connexionsAffichees(connexions, LIBELLES_EXEMPLE),
        aPlus: !vide && limite < CONNEXIONS_EXEMPLE.length,
        plusEnCours: false,
      },
    }
  }, [etat, personnes, limite])

  const actions: ActionsPersonnes = {
    afficherPlus: () => setLimite((avant) => avant + TAILLE),
    effacer: (intervenantId) => {
      setPersonnes((avant) =>
        avant.map((p) =>
          p.intervenant_id === intervenantId ? { ...p, prenom: PRENOM_EFFACE } : p,
        ),
      )
      return Promise.resolve(1)
    },
    effacerAnciens: () => {
      const nombre = nombreAEffacer(personnes)
      setPersonnes((avant) => avant.map((p) => ({ ...p, declarations_anciennes: 0 })))
      return Promise.resolve(nombre)
    },
  }

  return <VuePersonnes titre="Personnes" resultat={resultat} actions={actions} />
}
