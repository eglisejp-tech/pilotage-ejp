import { useState } from 'react'
import { useMotChargement } from '@/components/etats/useMotChargement'
import { useTitrePage } from '@/features/connexion/useTitrePage'
import { BlocActives } from '@/features/personnes/BlocActives'
import { BlocConnexions } from '@/features/personnes/BlocConnexions'
import { BlocSansActivite } from '@/features/personnes/BlocSansActivite'
import type { CompteAffiche, PersonneAffichee } from '@/features/personnes/construirePersonnes'
import { FenetreEffacement } from '@/features/personnes/FenetreEffacement'
import type { ActionsPersonnes, ResultatPersonnes } from '@/features/personnes/usePersonnes'
import { TEXTES_PERSONNES } from '@/features/personnes/textes'
import { ErreurDePage } from '@/pages/ErreurDePage'

interface Props {
  /** « Personnes », titre de l'écran et de l'onglet. */
  titre: string
  resultat: ResultatPersonnes
  actions: ActionsPersonnes
}

type Effacement =
  | { type: 'un'; intervenantId: number; contexte: string }
  /** `prenoms` : le nombre affiché, repris dans le message de réussite. */
  | { type: 'anciens'; contexte: string; prenoms: number }

const classeBouton =
  'inline-flex min-h-cible items-center self-start border border-encre bg-papier px-4 text-sm font-semibold text-encre hover:bg-fond'

/**
 * « Chargement » n'apparaît qu'après 300 ms (une réponse rapide ne fait rien clignoter), puis
 * « Chargement plus long que d'habitude » après 4 s (m248), par le mot commun des écrans.
 */
function Chargement() {
  const mot = useMotChargement(TEXTES_PERSONNES.chargement)
  return (
    <p role="status" aria-busy="true" className="py-[18px] text-encre-3">
      {mot}
    </p>
  )
}

/**
 * Onglet « Personnes » d'EJP Tech (T56) : qui a utilisé chaque compte de ministère, quand, et
 * l'effacement d'un prénom (sur demande, actif ou non, ou ceux de plus de 12 mois, chaque mois).
 * Le titre et sa phrase restent dans tous les états ; l'erreur de page propose « Réessayer ».
 */
export function VuePersonnes({ titre, resultat, actions }: Props) {
  useTitrePage(titre)
  const [effacement, setEffacement] = useState<Effacement | null>(null)
  const [message, setMessage] = useState('')

  const effacer = async () => {
    if (effacement === null) return
    if (effacement.type === 'un') {
      await actions.effacer(effacement.intervenantId)
      setMessage(TEXTES_PERSONNES.reussiteUn)
    } else {
      // La base rend le nombre de déclarations changées ; l'écran parle en prénoms, comme la
      // phrase « N prénoms ont plus de 12 mois. ».
      const declarations = await actions.effacerAnciens()
      setMessage(TEXTES_PERSONNES.reussiteAnciens(declarations === 0 ? 0 : effacement.prenoms))
    }
    setEffacement(null)
  }

  const surEffacer = (personne: PersonneAffichee, compte: CompteAffiche) =>
    setEffacement({
      type: 'un',
      intervenantId: personne.intervenantId,
      contexte: `${personne.prenom}, ${compte.libelle}`,
    })

  return (
    <section aria-labelledby="titre-page" className="flex flex-col gap-10">
      <header className="flex flex-col gap-2.5">
        <h1 id="titre-page" className="font-lecture text-titre leading-tight font-medium">
          {titre}
        </h1>
        <p className="max-w-[720px] leading-relaxed text-encre-2">
          {TEXTES_PERSONNES.introduction}
        </p>
        <p role="status" className="text-[15px] font-semibold">
          {message}
        </p>
      </header>

      {resultat.etat === 'erreur' ? (
        <ErreurDePage
          message={TEXTES_PERSONNES.erreur}
          libelleBouton={TEXTES_PERSONNES.reessayer}
          onReessayer={resultat.reessayer}
        />
      ) : null}
      {resultat.etat === 'chargement' ? <Chargement /> : null}
      {resultat.etat === 'pret' ? (
        <>
          {resultat.donnees.aEffacer > 0 ? (
            <div className="flex flex-col gap-3 bg-nuit-pale px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[15px]">{TEXTES_PERSONNES.anciens(resultat.donnees.aEffacer)}</p>
              <button
                type="button"
                onClick={() =>
                  setEffacement({
                    type: 'anciens',
                    contexte: TEXTES_PERSONNES.anciens(resultat.donnees.aEffacer),
                    prenoms: resultat.donnees.aEffacer,
                  })
                }
                className={classeBouton}
              >
                {TEXTES_PERSONNES.effacerAnciens}
              </button>
            </div>
          ) : null}
          <BlocActives actives={resultat.donnees.actives} surEffacer={surEffacer} />
          <BlocSansActivite comptes={resultat.donnees.sansActivite} surEffacer={surEffacer} />
          <BlocConnexions
            connexions={resultat.donnees.connexions}
            aPlus={resultat.donnees.aPlus}
            plusEnCours={resultat.donnees.plusEnCours}
            surPlus={actions.afficherPlus}
          />
        </>
      ) : null}

      {effacement !== null ? (
        <FenetreEffacement
          cible={{ type: effacement.type, contexte: effacement.contexte }}
          effacer={effacer}
          onAnnuler={() => setEffacement(null)}
        />
      ) : null}
    </section>
  )
}
