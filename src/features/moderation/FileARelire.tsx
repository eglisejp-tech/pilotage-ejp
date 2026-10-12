import { useEffect, useId, useRef, useState } from 'react'
import { EtatVide } from '@/components/etats/EtatVide'
import { TEXTES_VIDES } from '@/features/cette-semaine/textesVides'
import { ChargementSaisie } from '@/features/evenements/ChargementSaisie'
import { compterEnAttente } from '@/features/moderation/construire'
import type { TexteARelire } from '@/features/moderation/construire'
import { LigneARelire } from '@/features/moderation/LigneARelire'
import type { ChoixMasquage } from '@/features/moderation/schemas'
import { TEXTES_MODERATION } from '@/features/moderation/textes'
import { MessageReussite } from '@/features/saisie/MessageReussite'

/** Ce que montre la file « Champs libres à relire ». */
export type ContenuFile =
  | { etat: 'chargement' }
  | { etat: 'probleme'; reessayer: () => void }
  | {
      etat: 'liste'
      /** À relire d'abord, puis les décisions des 30 derniers jours (voir `construireTextesARelire`). */
      textes: TexteARelire[]
      relire: (texte: TexteARelire) => Promise<void>
      masquer: (texte: TexteARelire, choix: ChoixMasquage) => Promise<void>
    }

interface Props {
  contenu: ContenuFile
}

/**
 * La file de relecture de l'écran Modération (maquette 15), sous le bloc « Signalements » : le
 * titre « Champs libres à relire » avec « N textes en attente », la phrase qui dit ce que fait
 * EJP Tech, puis une ligne par texte (`LigneARelire`). Sans texte : « Aucun texte à relire. ».
 * Après une décision, le message est annoncé et le focus revient au titre (la ligne a changé de
 * place : à relire d'abord, puis les décisions).
 */
export function FileARelire({ contenu }: Props) {
  const idTitre = useId()
  const titre = useRef<HTMLHeadingElement>(null)
  const [reussite, setReussite] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(0)

  // Le focus revient au titre une fois la page à jour : le bouton cliqué a pu disparaître.
  useEffect(() => {
    if (envoi > 0) titre.current?.focus()
  }, [envoi])

  const surFait = (message: string) => {
    setReussite(message)
    setEnvoi((precedent) => precedent + 1)
  }

  return (
    <section aria-labelledby={idTitre} className="flex min-w-0 flex-col">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b-2 border-encre pb-3">
        <div className="flex max-w-prose flex-col gap-1">
          <h2
            id={idTitre}
            ref={titre}
            tabIndex={-1}
            className="font-lecture text-section leading-tight font-medium outline-hidden"
          >
            {TEXTES_MODERATION.titreFile}
          </h2>
          <p className="text-sm text-encre-2">{TEXTES_MODERATION.intro}</p>
        </div>
        {contenu.etat === 'liste' ? (
          <p className="text-note text-encre-2">
            {TEXTES_MODERATION.enAttente(compterEnAttente(contenu.textes))}
          </p>
        ) : null}
      </div>

      {contenu.etat === 'chargement' ? (
        <div className="py-[18px]">
          <ChargementSaisie />
        </div>
      ) : null}
      {contenu.etat === 'probleme' ? (
        <EtatVide
          situation="probleme_passager"
          action={{ libelle: TEXTES_VIDES.page.reessayer, surClic: contenu.reessayer }}
        >
          {TEXTES_VIDES.page.erreur}
        </EtatVide>
      ) : null}

      <MessageReussite message={reussite} envoi={envoi} />

      {contenu.etat === 'liste' ? (
        contenu.textes.length === 0 ? (
          <EtatVide situation="tout_est_fait">{TEXTES_MODERATION.vide}</EtatVide>
        ) : (
          <ol>
            {contenu.textes.map((texte) => (
              <li
                key={`${texte.cible}:${texte.cibleId}`}
                className="border-t border-filet first:border-t-0"
              >
                <LigneARelire
                  texte={texte}
                  relire={() => contenu.relire(texte)}
                  masquer={(choix) => contenu.masquer(texte, choix)}
                  surFait={surFait}
                />
              </li>
            ))}
          </ol>
        )
      ) : null}
    </section>
  )
}
