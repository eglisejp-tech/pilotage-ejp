import { useId, useState } from 'react'
import { Aide } from '@/components/aide/Aide'
import { LibelleEnvoi } from '@/components/etats/LibelleEnvoi'
import { MODELE_AUCUN } from '@/features/indicateurs/configuration/catalogue'
import { ChoixListePrevus } from '@/features/indicateurs/configuration/ChoixListePrevus'
import type { ConfigurationMinistere } from '@/features/indicateurs/configuration/construire'
import { ListePrevus } from '@/features/indicateurs/configuration/ListePrevus'
import { blocPrevusVisible } from '@/features/indicateurs/configuration/prevus'
import type { EtatPrevus } from '@/features/indicateurs/configuration/prevus'
import { RefusCreation } from '@/features/indicateurs/configuration/RefusCreation'
import type { CreationPrevus } from '@/features/indicateurs/configuration/useCreationPrevus'
import {
  boutonCreerPrevus,
  introPrevus,
  prevusTousRetires,
  TEXTES_CONFIGURATION,
} from '@/features/indicateurs/configuration/textes'

interface Props {
  donnees: ConfigurationMinistere
  creation: CreationPrevus
}

const textes = TEXTES_CONFIGURATION.ministere
const classeBouton =
  'inline-flex min-h-14 items-center justify-center bg-lumiere px-5 text-[15px] font-semibold text-encre aria-disabled:cursor-wait'
const classeLien =
  'inline-flex min-h-cible items-center text-[15px] font-semibold underline underline-offset-4'

/** Ce que la liste montre d'abord : la suggestion tant que rien n'est choisi, sinon le choix. */
function choixDe(prevus: EtatPrevus): string {
  switch (prevus.genre) {
    case 'a_choisir':
      return prevus.suggestion ?? ''
    case 'aucun':
      return MODELE_AUCUN
    case 'a_creer':
    case 'crees':
      return prevus.modele.code
  }
}

/**
 * Bloc « Indicateurs prévus » de `/indicateurs/:id` (7.2, T72). Rien de choisi : la liste
 * « Nom du ministère dans la liste », présélectionnée d'après le nom du ministère, et « Enregistrer
 * le choix ». Liste choisie : ses prévus à créer et « Créer ces 6 indicateurs ». « Aucun prévu », ou
 * une liste dont aucun prévu n'est suivi : « Changer » rouvre le choix. La base enregistre le choix,
 * crée tout ou rien, sans doublon ; son refus s'affiche sous le bouton. Le bloc disparaît dès que
 * les prévus sont créés ; le message de réussite reste sous la phrase du ministère.
 */
export function BlocPrevus({ donnees, creation }: Props) {
  const idTitre = useId()
  const { prevus } = donnees
  const [changer, setChanger] = useState(false)
  const [choix, setChoix] = useState(() => choixDe(prevus))
  if (!blocPrevusVisible(prevus)) return null

  const enCours = creation.enCours === donnees.id
  const ministere = { id: donnees.id, nom: donnees.nom }
  const formulaire = prevus.genre === 'a_choisir' || changer
  const modifiable = prevus.genre === 'aucun' || (prevus.genre !== 'a_choisir' && prevus.modifiable)
  const ouvrirChoix = () => {
    setChoix(choixDe(prevus))
    setChanger(true)
  }
  const enregistrer = (liste: { code: string; nom: string }) => {
    void creation.choisir(ministere, liste).then((accepte) => {
      if (accepte) setChanger(false)
    })
  }
  const lienChanger =
    !formulaire && modifiable ? (
      <button type="button" onClick={ouvrirChoix} className={classeLien}>
        {textes.changer}
      </button>
    ) : null

  return (
    <section aria-labelledby={idTitre} className="mt-6 border border-filet bg-papier p-4">
      <div className="flex flex-wrap items-center">
        <h2 id={idTitre} className="font-lecture text-[22px] leading-tight font-medium">
          {textes.titrePrevus}
        </h2>
        <Aide code="indicateurs.prevus" libelle={textes.titrePrevus} placement="flottante" />
      </div>
      {formulaire ? (
        <ChoixListePrevus
          modeles={donnees.modeles}
          choix={choix}
          onChoix={setChoix}
          suggestion={prevus.genre === 'a_choisir' ? prevus.suggestion : null}
          enCours={enCours}
          onEnregistrer={enregistrer}
          onAnnuler={changer ? () => setChanger(false) : undefined}
        />
      ) : null}
      {!formulaire && prevus.genre === 'a_creer' ? (
        <div className="mt-3 flex flex-col items-start gap-3">
          <p className="max-w-prose text-encre-2">
            {introPrevus(prevus.modele.nom, prevus.manquants.length)}
          </p>
          <ListePrevus prevus={prevus.manquants} />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <button
              type="button"
              aria-disabled={enCours || undefined}
              aria-busy={enCours || undefined}
              onClick={() => void creation.creer(ministere, prevus.modele.code)}
              className={classeBouton}
            >
              {/* Pendant l'envoi : « Création en cours » (m227). */}
              <LibelleEnvoi enCours={enCours} libelleEnCours={TEXTES_CONFIGURATION.creationEnCours}>
                {boutonCreerPrevus(prevus.manquants.length)}
              </LibelleEnvoi>
            </button>
            {lienChanger}
          </div>
        </div>
      ) : null}
      {!formulaire && prevus.genre !== 'a_creer' ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2">
          <p className="max-w-prose text-encre-2">
            {prevus.genre === 'aucun'
              ? textes.aucunPrevuExplication
              : prevusTousRetires(prevus.modele.nom)}
          </p>
          {lienChanger}
        </div>
      ) : null}
      <RefusCreation refus={creation.dernier === donnees.id ? creation.refus : null} />
    </section>
  )
}
