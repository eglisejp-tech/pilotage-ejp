import { useEffect, useId, useRef, useState } from 'react'
import { Arrivee } from '@/components/etats/Arrivee'
import { EtatVide } from '@/components/etats/EtatVide'
import { useLectureAffichee } from '@/components/etats/useLectureAffichee'
import { TEXTES_VIDES } from '@/features/cette-semaine/textesVides'
import { ChargementBloc } from '@/features/fiche/ChargementBloc'
import { GRILLE_FILE, RANGEE_FILE } from '@/features/moderation/colonnesFile'
import { compterEnAttente } from '@/features/moderation/construire'
import type { TexteARelire } from '@/features/moderation/construire'
import { LigneARelire } from '@/features/moderation/LigneARelire'
import type { ChoixMasquage } from '@/features/moderation/schemas'
import { TEXTES_MODERATION } from '@/features/moderation/textes'
import { MessageReussite } from '@/features/saisie/MessageReussite'
import { cn } from '@/lib/utils'

/** Ce que montre la file « Textes à relire ». */
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
 * titre « Textes à relire » avec « N textes à relire », la phrase qui dit quoi masquer, puis une
 * ligne par texte (`LigneARelire`). Sans texte : « Aucun texte à relire. » (T66).
 * Après une décision, le message est annoncé et le focus revient au titre (la ligne a changé de
 * place : à relire d'abord, puis les décisions).
 */
export function FileARelire({ contenu: lecture }: Props) {
  // T65 : la petite flamme reste au moins 600 ms une fois montrée ; le nombre en attente et la
  // liste arrivent ensuite ensemble, en fondu.
  const { lecture: contenu, fondu } = useLectureAffichee(lecture)
  const attente = contenu.etat === 'chargement'
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
        <div className="flex max-w-lecture flex-col gap-1">
          <h2
            id={idTitre}
            ref={titre}
            tabIndex={-1}
            className="font-lecture text-section leading-tight font-medium outline-hidden"
          >
            {TEXTES_MODERATION.titreFile}
          </h2>
          <p className="text-detail text-encre-2">{TEXTES_MODERATION.intro}</p>
        </div>
        {contenu.etat === 'liste' ? (
          <p className="text-note text-encre-2">
            {TEXTES_MODERATION.enAttente(compterEnAttente(contenu.textes))}
          </p>
        ) : null}
      </div>

      {attente ? <ChargementBloc texte={TEXTES_MODERATION.chargement} /> : null}
      {!attente && contenu.etat === 'probleme' ? (
        <Arrivee fondu={fondu}>
          <EtatVide
            situation="probleme_passager"
            action={{ libelle: TEXTES_VIDES.page.reessayer, surClic: contenu.reessayer }}
          >
            {TEXTES_VIDES.page.erreur}
          </EtatVide>
        </Arrivee>
      ) : null}

      {/* La région des messages reste montée dans tous les états : ses annonces partent. */}
      <MessageReussite message={reussite} envoi={envoi} />

      {!attente && contenu.etat === 'liste' ? (
        <Arrivee fondu={fondu}>
          {contenu.textes.length === 0 ? (
            <EtatVide situation="tout_est_fait">{TEXTES_MODERATION.vide}</EtatVide>
          ) : (
            <ol className={GRILLE_FILE}>
              {contenu.textes.map((texte) => (
                <li
                  key={`${texte.cible}:${texte.cibleId}`}
                  className={cn('border-t border-filet first:border-t-0', RANGEE_FILE)}
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
          )}
        </Arrivee>
      ) : null}
    </section>
  )
}
