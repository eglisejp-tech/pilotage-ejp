import { useId } from 'react'
import { useSearchParams } from 'react-router'
import { EtatVide } from '@/components/etats/EtatVide'
import type { ActionVide, SituationVide } from '@/components/etats/situations'
import { FiltreMinistere } from '@/features/points/FiltreMinistere'
import { LienNouveauPoint, VERS_NOUVEAU_POINT } from '@/features/points/LienNouveauPoint'
import { ListePoints } from '@/features/points/ListePoints'
import type { DonneesPoints } from '@/features/points/modelePoints'
import { OngletsPoints } from '@/features/points/OngletsPoints'
import { TEXTES_POINTS } from '@/features/points/textesPoints'
import type { ProfilPoints, VuePoints as Vue } from '@/features/points/textesPoints'
import { TraitesRecemment } from '@/features/points/TraitesRecemment'
import { lireVuePoints } from '@/features/points/vue'
import type { CompteDesActions } from '@/features/points-actions/ActionsPoint'

interface Props {
  /** Titre de l'écran pour ce profil : « Points d'attention » ou « Mes points ». */
  titre: string
  profil: ProfilPoints
  donnees: DonneesPoints
  compte: CompteDesActions
}

/**
 * État vide de la vue : la phrase, sa situation (T36) et au plus une action (T66, m159 à m163) :
 * « Voir tous les ministères » sous un filtre sans résultat, « Nouveau point » pour le ministère
 * sans point ouvert ou sans aucun point.
 */
function videDe(
  vue: Vue,
  donnees: DonneesPoints,
  profil: ProfilPoints,
  retirerFiltre: () => void,
): { situation: SituationVide; texte: string; action?: ActionVide } {
  const choisi = donnees.ministereChoisi
  if (choisi !== null) {
    const texte = {
      ouverts: TEXTES_POINTS.vide.ouvertsDe,
      traites: TEXTES_POINTS.vide.traitesDe,
      tous: TEXTES_POINTS.vide.tousDe,
    }[vue](choisi.nom)
    return {
      situation: 'aucun_resultat',
      texte,
      action: { libelle: TEXTES_POINTS.voirTousLesMinisteres, surClic: retirerFiltre },
    }
  }
  return {
    situation: vue === 'ouverts' ? 'tout_est_fait' : 'premier_usage',
    texte: TEXTES_POINTS.vide[vue],
    action:
      profil === 'ministere' && vue !== 'traites'
        ? { libelle: TEXTES_POINTS.nouveauPoint, vers: VERS_NOUVEAU_POINT }
        : undefined,
  }
}

/**
 * Écran 05 « Points d'attention » du berger, du conseil et d'EJP Tech, et « Mes points » du
 * ministère (BRIEF, section 9 ; maquette 05) : titre ; pour le ministère, la phrase de sa liste et
 * le bouton « Nouveau point » (T66) ; onglets Ouverts, Traités et Tous
 * avec leur nombre, filtre « Tous les ministères » (pas pour le ministère), tableau des points,
 * puis « Traités récemment » sous l'onglet Ouverts. La vue (`?vue=`) et le ministère
 * (`?ministere=`) sont dans l'adresse. Les nombres des onglets suivent le filtre.
 */
export function VuePoints({ titre, profil, donnees, compte }: Props) {
  const [parametres, setParametres] = useSearchParams()
  const idListe = useId()
  const vue = lireVuePoints(parametres.get('vue'))

  const nombres = {
    ouverts: donnees.ouverts.length,
    traites: donnees.traites.length,
    tous: donnees.ouverts.length + donnees.traites.length,
  }
  const lignes = {
    ouverts: donnees.ouverts,
    traites: donnees.traites,
    tous: donnees.tous,
  }[vue]

  const choisirMinistere = (id: string | null) => {
    const suivants = new URLSearchParams(parametres)
    if (id === null) suivants.delete('ministere')
    else suivants.set('ministere', id)
    setParametres(suivants)
  }

  const vide =
    lignes.length === 0 ? videDe(vue, donnees, profil, () => choisirMinistere(null)) : null
  const introduction = profil === 'ministere' ? TEXTES_POINTS.introduction.ministere : null
  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col gap-2.5">
        <h1 className="font-lecture text-titre leading-tight font-medium">{titre}</h1>
        {introduction !== null ? (
          <p className="max-w-[720px] leading-relaxed text-encre-2">{introduction}</p>
        ) : null}
        {profil === 'ministere' ? <LienNouveauPoint /> : null}
      </header>

      <section aria-labelledby={idListe} className="flex min-w-0 flex-col">
        <div className="flex flex-wrap items-end justify-between gap-x-4 border-b-2 border-encre">
          <OngletsPoints vue={vue} nombres={nombres} />
          {donnees.ministeres !== null ? (
            <FiltreMinistere
              options={donnees.ministeres}
              choisi={donnees.ministereChoisi}
              surChoix={choisirMinistere}
            />
          ) : null}
        </div>
        <h2 id={idListe} className="sr-only">
          {TEXTES_POINTS.titreListe[vue]}
        </h2>
        {vide !== null ? (
          <EtatVide situation={vide.situation} action={vide.action}>
            {vide.texte}
          </EtatVide>
        ) : (
          <ListePoints lignes={lignes} compte={compte} />
        )}
      </section>

      {vue === 'ouverts' ? <TraitesRecemment lignes={donnees.recents} /> : null}
    </div>
  )
}
