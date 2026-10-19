import { Arrivee } from '@/components/etats/Arrivee'
import { useAttenteChargement } from '@/components/etats/useAttenteChargement'
import { useTitrePage } from '@/features/connexion/useTitrePage'
import { TEXTES_VIDES } from '@/features/cette-semaine/textesVides'
import { ChargementMaSemaine } from '@/features/ma-semaine/ChargementMaSemaine'
import { TEXTES_MA_SEMAINE } from '@/features/ma-semaine/textesMaSemaine'
import { useMaSemaine } from '@/features/ma-semaine/useMaSemaine'
import { VueMaSemaine } from '@/features/ma-semaine/VueMaSemaine'
import { ErreurDePage } from '@/pages/ErreurDePage'

type Proprietes = {
  ministereId: string
}

/**
 * Accueil « / » d'un compte de ministère (BRIEF, section 9 ; décision T57) : « Ma semaine ». Trois
 * états : le chargement (titres tout de suite, la flamme et « Chargement de Ma semaine » après
 * 300 ms, au moins 600 ms une fois montrés, T65), l'erreur de page avec « Réessayer » (échec ou
 * 10 s sans réponse), puis la vue, en fondu. Titre : « Ma semaine, Pilotage EJP ». Les lectures
 * de la vue du berger ne sont pas faites.
 */
export function PageMaSemaine({ ministereId }: Proprietes) {
  useTitrePage(TEXTES_MA_SEMAINE.onglet)
  const resultat = useMaSemaine(ministereId)
  const { attente, fondu } = useAttenteChargement(resultat.etat === 'chargement')

  if (attente) return <ChargementMaSemaine />
  if (resultat.etat === 'erreur') {
    return (
      <>
        <h1 className="sr-only">{TEXTES_MA_SEMAINE.onglet}</h1>
        <ErreurDePage
          message={TEXTES_VIDES.page.erreur}
          libelleBouton={TEXTES_VIDES.page.reessayer}
          onReessayer={resultat.reessayer}
        />
      </>
    )
  }
  if (resultat.etat === 'pret') {
    return (
      <Arrivee fondu={fondu} mode="sections">
        <VueMaSemaine donnees={resultat.donnees} />
      </Arrivee>
    )
  }
  return <ChargementMaSemaine />
}
