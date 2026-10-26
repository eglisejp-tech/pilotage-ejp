import { useEffect, useId, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { Arrivee } from '@/components/etats/Arrivee'
import { EtatVide } from '@/components/etats/EtatVide'
import { useLectureAffichee } from '@/components/etats/useLectureAffichee'
import type { EtapeDuSuivi, LigneSignalement } from '@/data/signalements'
import { TEXTES_VIDES } from '@/features/cette-semaine/textesVides'
import { useTitrePage } from '@/features/connexion/useTitrePage'
import { ChargementBloc } from '@/features/fiche/ChargementBloc'
import { MessageReussite } from '@/features/saisie/MessageReussite'
import { ArticleSignalement } from '@/features/signalement/ArticleSignalement'
import { idTitreSignalement } from '@/features/signalement/identifiants'
import type { GestesMinistere } from '@/features/signalement/ArticleSignalement'
import { groupesMinistere, lignesDe } from '@/features/signalement/suivi'
import { TEXTES_SUIVI } from '@/features/signalement/textes'

/** Ce que montre « Mes signalements ». */
export type ContenuSuivi =
  | { etat: 'chargement' }
  | { etat: 'probleme'; reessayer: () => void }
  | {
      etat: 'liste'
      /** Ouverts et clos des 30 derniers jours (filtres de la base), du plus ancien au plus récent. */
      signalements: LigneSignalement[]
      /** Leurs lignes de suivi. */
      suivi: EtapeDuSuivi[]
      gestes: GestesMinistere
      /** Relit la liste (après un refus qui dit que le signalement a changé). */
      relire: () => void
    }

interface Props {
  contenu: ContenuSuivi
  /** « Mes signalements » : le titre de l'écran pour ce profil. */
  titre: string
}

/**
 * « Mes signalements » du ministère (`/signalements`, T77) : sous le titre, trois groupes dans cet
 * ordre, « À vérifier » (Répondu), « En cours » (Reçu et En cours), « Clos ces 30 derniers
 * jours » ; un groupe vide n'apparaît pas. Chargement (la petite flamme, T65), problème passager
 * avec « Réessayer », rien du tout, ou seulement des clos (« Aucun signalement ouvert. »). Après un
 * geste, le message est annoncé (`role="status"`) et le focus va sur l'en-tête du signalement,
 * qui a changé de groupe. Une ancre `#<id>` (le lien du bandeau de « Ma semaine ») fait défiler
 * jusqu'au signalement et met le focus sur son en-tête ; une ancre inconnue ouvre la page.
 */
export function ContenuMesSignalements({ contenu: lecture, titre }: Props) {
  useTitrePage(titre)
  const { lecture: contenu, fondu } = useLectureAffichee(lecture)
  const attente = contenu.etat === 'chargement'
  const { hash } = useLocation()
  const [reussite, setReussite] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(0)
  const [refus, setRefus] = useState<{ id: string; message: string } | null>(null)
  const [cible, setCible] = useState<string | null>(null)
  const ancreFaite = useRef(false)
  const idAVerifier = useId()
  const idEnCours = useId()
  const idClos = useId()

  const liste = contenu.etat === 'liste' ? contenu : null
  const groupes = groupesMinistere(liste?.signalements ?? [])
  // Le groupe de la cible du focus : quand la lecture le change, le focus suit le signalement.
  const statutCible = cible
    ? liste?.signalements.find((ligne) => ligne.id === cible)?.statut
    : undefined

  useEffect(() => {
    if (cible === null) return
    document.getElementById(idTitreSignalement(cible))?.focus()
  }, [cible, statutCible])

  // L'ancre du lien de « Ma semaine », une fois, quand la liste est là.
  useEffect(() => {
    if (ancreFaite.current || !liste) return
    ancreFaite.current = true
    const id = decodeURIComponent(hash.replace(/^#/, ''))
    if (id === '') return
    const article = document.getElementById(id)
    if (!article) return
    article.scrollIntoView({ block: 'start' })
    document.getElementById(idTitreSignalement(id))?.focus({ preventScroll: true })
  }, [liste, hash])

  const surReussite = (id: string, message: string) => {
    setRefus(null)
    setReussite(message)
    setEnvoi((precedent) => precedent + 1)
    setCible(id)
  }
  const surChange = (id: string, message: string) => {
    setReussite(null)
    setRefus({ id, message })
    liste?.relire()
  }

  const article = (signalement: LigneSignalement) =>
    liste ? (
      <li key={signalement.id} className="border-t border-filet first:border-t-0">
        <ArticleSignalement
          signalement={signalement}
          lignes={lignesDe(liste.suivi, signalement.id)}
          gestes={liste.gestes}
          refus={refus?.id === signalement.id ? refus.message : null}
          surReussite={surReussite}
          surChange={surChange}
        />
      </li>
    ) : null

  const groupe = (id: string, nom: string, lignes: LigneSignalement[]) =>
    lignes.length === 0 ? null : (
      <section aria-labelledby={id} className="flex min-w-0 flex-col">
        <h2
          id={id}
          className="border-b-2 border-encre pb-3 font-lecture text-section leading-tight font-medium"
        >
          {nom}
        </h2>
        <ol>{lignes.map(article)}</ol>
      </section>
    )

  const ouverts = groupes.aVerifier.length + groupes.enCours.length

  return (
    <div className="flex max-w-[52rem] flex-col gap-8">
      <h1 className="font-lecture text-titre leading-[1.1] font-medium">{titre}</h1>
      <MessageReussite message={reussite} envoi={envoi} />
      {attente ? <ChargementBloc texte={TEXTES_SUIVI.chargement} /> : null}
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
      {!attente && liste ? (
        <Arrivee fondu={fondu}>
          {liste.signalements.length === 0 ? (
            <EtatVide situation="tout_est_fait">{TEXTES_SUIVI.vide}</EtatVide>
          ) : ouverts === 0 ? (
            <p className="text-encre-2">{TEXTES_SUIVI.aucunOuvert}</p>
          ) : null}
          {groupe(idAVerifier, TEXTES_SUIVI.groupeAVerifier, groupes.aVerifier)}
          {groupe(idEnCours, TEXTES_SUIVI.groupeEnCours, groupes.enCours)}
          {groupe(idClos, TEXTES_SUIVI.groupeClos, groupes.clos)}
        </Arrivee>
      ) : null}
    </div>
  )
}
