import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { TEXTE_MASQUE } from '@/features/cette-semaine/textesVides'
import { BandeauIndicateurs } from '@/features/moderation/BandeauIndicateurs'
import { construireTextesARelire } from '@/features/moderation/construire'
import { EcranModeration } from '@/features/moderation/EcranModeration'
import { FileARelire } from '@/features/moderation/FileARelire'
import type { ContenuFile } from '@/features/moderation/FileARelire'
import {
  INDICATEURS_EXEMPLE,
  lignesDeLaFile,
  lireVueModeration,
  masque,
  MINISTERES_EXEMPLE,
  relu,
} from '@/features/moderation/apercu/exemples'
import type { Masquage } from '@/features/moderation/schemas'
import { ContenuBlocSignalements } from '@/features/signalement/ContenuBlocSignalements'
import {
  attendre,
  ECHEC_CONNEXION,
  signalementsDuBloc,
} from '@/features/signalement/apercu/exemples'
import type { LigneSignalement } from '@/data/signalements'
import { PageNonDisponible } from '@/pages/PageNonDisponible'

const reessayer = () => undefined

/** Masquage simulé d'un signalement : son texte ou son commentaire devient le texte masqué. */
function masquerSignalement(ligne: LigneSignalement, masquage: Masquage): LigneSignalement {
  if (masquage.cible === 'signalement_suivi' && ligne.suivi_id === masquage.cibleId) {
    return { ...ligne, commentaire: TEXTE_MASQUE }
  }
  if (masquage.cible === 'signalement' && ligne.id === masquage.cibleId) {
    return { ...ligne, texte: TEXTE_MASQUE }
  }
  return ligne
}

/**
 * Aperçu de développement de l'écran Modération (lot L6), sans base : le vrai écran, avec des
 * données d'exemple et des décisions simulées. Adresse : /apercu/moderation.
 * - `?profil=admin_plateforme` (ou sans profil) : l'écran d'EJP Tech, avec « N indicateurs
 *   attendent votre validation », le bloc « Signalements » et la file « Champs libres à relire » ;
 *   `vue=ecran` (défaut), `sans-indicateur`, `file-vide`, `file-chargement`, `file-probleme`,
 *   `lien-long` (un lien de 90 caractères collé dans un texte et un libellé) ;
 * - `?profil=ministere`, `berger`, `conseil` ou `admin_eglise` : « Page non disponible ».
 * `&envoi=echec` simule une connexion perdue à chaque décision. Enregistrée seulement en
 * développement.
 */
export function ApercuModeration() {
  const [parametres] = useSearchParams()
  const profil = parametres.get('profil')
  if (profil !== null && profil !== 'admin_plateforme') return <PageNonDisponible />
  const vue = lireVueModeration(parametres.get('vue'))
  return <EcranApercu key={vue} vue={vue} echec={parametres.get('envoi') === 'echec'} />
}

function EcranApercu({
  vue,
  echec,
}: {
  vue: ReturnType<typeof lireVueModeration>
  echec: boolean
}) {
  const [lignes, setLignes] = useState(() => lignesDeLaFile(vue))
  const [signalements, setSignalements] = useState(() => signalementsDuBloc('bloc'))

  let file: ContenuFile
  if (vue === 'file-chargement') file = { etat: 'chargement' }
  else if (vue === 'file-probleme') file = { etat: 'probleme', reessayer }
  else {
    file = {
      etat: 'liste',
      textes: construireTextesARelire(lignes, MINISTERES_EXEMPLE),
      relire: async (texte) => {
        await attendre()
        if (echec) throw ECHEC_CONNEXION
        setLignes((avant) =>
          avant.map((ligne) => (ligne.cible_id === texte.cibleId ? relu(ligne) : ligne)),
        )
      },
      masquer: async (texte, choix) => {
        await attendre()
        if (echec) throw ECHEC_CONNEXION
        setLignes((avant) =>
          avant.map((ligne) =>
            ligne.cible_id === texte.cibleId ? masque(ligne, choix.champ, choix.motif) : ligne,
          ),
        )
      },
    }
  }

  return (
    <EcranModeration
      titre="Modération"
      bandeau={
        vue === 'sans-indicateur' ? null : <BandeauIndicateurs indicateurs={INDICATEURS_EXEMPLE} />
      }
      signalements={
        <ContenuBlocSignalements
          contenu={{
            etat: 'liste',
            signalements,
            cloturer: async () => {
              await attendre()
            },
            relire: () => undefined,
            masquer: async (masquage) => {
              await attendre()
              if (echec) throw ECHEC_CONNEXION
              setSignalements((avant) => avant.map((ligne) => masquerSignalement(ligne, masquage)))
            },
          }}
        />
      }
      file={<FileARelire contenu={file} />}
    />
  )
}
