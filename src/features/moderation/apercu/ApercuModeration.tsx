import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { BandeauIndicateurs } from '@/features/moderation/BandeauIndicateurs'
import { construireTextesARelire } from '@/features/moderation/construire'
import { EcranModeration } from '@/features/moderation/EcranModeration'
import { ApercuIncidents } from '@/features/moderation/apercu/ApercuIncidents'
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
import { ContenuBlocSignalements } from '@/features/signalement/ContenuBlocSignalements'
import { attendre, ECHEC_CONNEXION } from '@/features/signalement/apercu/exemples'
import { useBlocSimule } from '@/features/signalement/apercu/useBlocSimule'
import { PageNonDisponible } from '@/pages/PageNonDisponible'

const reessayer = () => undefined

/**
 * Aperçu de développement de l'écran Modération (lot L6), sans base : le vrai écran, avec des
 * données d'exemple et des décisions simulées. Adresse : /apercu/moderation.
 * - `?profil=admin_plateforme` (ou sans profil) : l'écran d'EJP Tech, avec « N indicateurs
 *   attendent votre validation », le bloc « Signalements » (T77, gestes du suivi simulés) et la
 *   file « Champs libres à relire » ; `vue=ecran` (défaut), `sans-indicateur`, `file-vide`,
 *   `file-chargement`, `file-probleme`, `lien-long` (un lien de 90 caractères collé dans un texte
 *   et un libellé) ;
 * - `?profil=ministere`, `berger`, `conseil` ou `admin_eglise` : « Page non disponible ».
 * `&envoi=echec` simule une connexion perdue à chaque décision et à chaque geste. Enregistrée
 * seulement en développement.
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
  const bloc = useBlocSimule('bloc', echec ? 'echec' : null)

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
            ...bloc.etat,
            gestes: bloc.gestes,
            relire: () => undefined,
            masquer: bloc.masquer,
          }}
        />
      }
      file={
        <>
          {/* Incidents d'envoi (T76, lot C), repliés sous les signalements. */}
          <ApercuIncidents />
          <FileARelire contenu={file} />
        </>
      }
    />
  )
}
