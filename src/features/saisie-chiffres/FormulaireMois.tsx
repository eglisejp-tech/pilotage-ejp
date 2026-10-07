import { useEffect, useState } from 'react'
import type { ChampChiffre as Champ } from '@/features/saisie-chiffres/champs'
import { ChampChiffre } from '@/features/saisie-chiffres/ChampChiffre'
import { ChampPrecision } from '@/features/saisie-chiffres/ChampPrecision'
import { ChoixMois } from '@/features/saisie-chiffres/ChoixMois'
import type { MoisAChoisir } from '@/features/saisie-chiffres/choixPeriode'
import {
  idGrille,
  idPrecision,
  placerErreurBase,
  preparerMois,
  premierChampEnErreur,
  sansErreur,
} from '@/features/saisie-chiffres/envoi'
import type { ErreursFormulaire, SaisieSensible } from '@/features/saisie-chiffres/envoi'
import { focaliserChamp } from '@/features/saisie-chiffres/focus'
import { FormulaireChiffres } from '@/features/saisie-chiffres/FormulaireChiffres'
import { GrilleRepartition } from '@/features/saisie-chiffres/GrilleRepartition'
import type { LigneMois } from '@/features/saisie-chiffres/schemas'
import { reussiteMois, TEXTES_CHIFFRES } from '@/features/saisie-chiffres/textes'
import {
  etatGrille,
  lireRepartition,
  lireValeur,
  repartitionDepart,
  valeurDepart,
} from '@/features/saisie-chiffres/valeurs'
import type { ValeurChamp } from '@/features/saisie-chiffres/valeurs'
import { useEnvoiSaisie } from '@/features/saisie-session/useEnvoiSaisie'
import type { EtatEnvoi } from '@/features/saisie-session/useEnvoiSaisie'
import type { Mois } from '@/lib/metier/periodes'

interface Props {
  mois: Mois
  champs: readonly Champ[]
  proposes: readonly MoisAChoisir[]
  rattrapage: readonly MoisAChoisir[]
  /** Envoie le mois en un appel ; rejette en cas d'échec (les valeurs restent). */
  enregistrer: (lignes: LigneMois[]) => Promise<void>
}

function sensiblesDeDepart(champs: readonly Champ[]): Record<string, SaisieSensible> {
  return Object.fromEntries(
    champs.flatMap((champ) =>
      champ.sensible === null
        ? []
        : [
            [
              champ.id,
              {
                precision: champ.sensible.precisionDepart ?? '',
                repartition: repartitionDepart(
                  champ.sensible.categories.map((categorie) => categorie.code),
                  champ.sensible.repartitionDepart,
                ),
              },
            ] as const,
          ],
    ),
  )
}

/**
 * « Chiffres du mois » (dérivé de 08, BRIEF section 9) : le choix du mois, puis un champ par
 * indicateur du mois, repris avec la saisie qui fait foi (« Déjà saisi : ... »). Sous le total
 * d'un sensible, « Précision (facultatif) » et, s'il a des catégories, la grille « Répartition
 * (facultatif) », reprises du total le plus récent (P46, P47). Seuls les chiffres qui changent
 * partent, tout le mois en un appel : tout ou rien. Un refus de la base sur une précision
 * s'affiche sous ce champ, tel quel ; les valeurs restent.
 */
export function FormulaireMois({ mois, champs, proposes, rattrapage, enregistrer }: Props) {
  const [valeurs, setValeurs] = useState<Record<string, ValeurChamp>>(() =>
    Object.fromEntries(champs.map((champ) => [champ.id, valeurDepart(champ)] as const)),
  )
  const [sensibles, setSensibles] = useState<Record<string, SaisieSensible>>(() =>
    sensiblesDeDepart(champs),
  )
  const [erreurs, setErreurs] = useState<ErreursFormulaire>({})
  const [rien, setRien] = useState<'inchange' | 'aucun' | null>(null)
  const [envoyees, setEnvoyees] = useState<LigneMois[]>([])
  const envoi = useEnvoiSaisie()
  const preparation = preparerMois(champs, valeurs, sensibles)
  const signature = `${mois}|${JSON.stringify(preparation.lignes)}`
  // Un refus de la base placé sous un champ disparaît dès que la personne modifie ce champ.
  const [echecVu, setEchecVu] = useState<EtatEnvoi['echec']>(null)
  const echec = envoi.echec === echecVu ? null : envoi.echec
  const place = echec
    ? placerErreurBase(echec.message, envoyees)
    : ({ indicateurId: null, partie: 'bouton' } as const)

  // Après un refus de la base sous un champ, le focus y va : le champ référence l'erreur par
  // `aria-describedby`, elle est donc lue.
  const { indicateurId: indicateurRefuse, partie: partieRefusee } = place
  useEffect(() => {
    if (echec === null || indicateurRefuse === null) return
    focaliserChamp(
      partieRefusee === 'precision' ? idPrecision(indicateurRefuse) : idGrille(indicateurRefuse),
    )
  }, [echec, indicateurRefuse, partieRefusee])

  // `partie` : ce que la personne modifie. Le total compte pour la grille (la somme dépend de lui).
  const effacer = (id: string, partie: 'precision' | 'repartition') => {
    setErreurs((precedentes) => ({ ...precedentes, [id]: {} }))
    setRien(null)
    if (indicateurRefuse === id && partieRefusee === partie) setEchecVu(envoi.echec)
  }
  const changerValeur = (id: string) => (valeur: ValeurChamp) => {
    setValeurs((precedentes) => ({ ...precedentes, [id]: valeur }))
    effacer(id, 'repartition')
  }
  const changerPrecision = (id: string) => (texte: string) => {
    setSensibles((precedents) => ({
      ...precedents,
      [id]: { precision: texte, repartition: precedents[id]?.repartition ?? {} },
    }))
    effacer(id, 'precision')
  }
  const changerCategorie = (id: string) => (code: string, valeur: string) => {
    setSensibles((precedents) => ({
      ...precedents,
      [id]: {
        precision: precedents[id]?.precision ?? '',
        repartition: { ...precedents[id]?.repartition, [code]: valeur },
      },
    }))
    effacer(id, 'repartition')
  }

  const soumettre = () => {
    setErreurs(preparation.erreurs)
    if (!sansErreur(preparation.erreurs)) {
      setRien(null)
      const premier = premierChampEnErreur(champs, preparation.erreurs)
      if (premier) focaliserChamp(premier)
      return
    }
    if (preparation.lignes.length === 0) {
      setRien(preparation.inchange ? 'inchange' : 'aucun')
      return
    }
    setRien(null)
    setEnvoyees(preparation.lignes)
    void envoi.envoyer(() => enregistrer(preparation.lignes), reussiteMois(mois), signature)
  }

  return (
    <>
      <ChoixMois mois={mois} proposes={proposes} rattrapage={rattrapage} />
      <FormulaireChiffres
        bouton={TEXTES_CHIFFRES.boutonMois}
        envoi={envoi}
        dejaEnvoye={envoi.dejaEnvoye(signature)}
        doublon={envoi.doublonRefuse(signature) || rien === 'inchange'}
        erreurFormulaire={rien === 'aucun' ? TEXTES_CHIFFRES.aucunChiffre : null}
        erreurSousLeBouton={echec !== null && place.partie === 'bouton'}
        ecran="saisie_mois"
        correction={champs.some((champ) => champ.deja !== null)}
        onSubmit={soumettre}
      >
        {champs.map((champ) => {
          const erreur = erreurs[champ.id] ?? {}
          const valeur = valeurs[champ.id] ?? valeurDepart(champ)
          const champSaisi = (
            <ChampChiffre
              champ={champ}
              valeur={valeur}
              onChange={changerValeur(champ.id)}
              erreur={erreur.valeur}
            />
          )
          if (champ.sensible === null) return <div key={champ.id}>{champSaisi}</div>
          const saisie = sensibles[champ.id] ?? { precision: '', repartition: {} }
          const erreurBase = (partie: 'precision' | 'repartition') =>
            place.indicateurId === champ.id && place.partie === partie
              ? (echec?.message ?? undefined)
              : undefined
          const codes = champ.sensible.categories.map((categorie) => categorie.code)
          return (
            <div
              key={champ.id}
              className="flex flex-col gap-4 border border-filet bg-papier px-4 pt-1 pb-4"
            >
              {champSaisi}
              <ChampPrecision
                indicateurId={champ.id}
                valeur={saisie.precision}
                onChange={changerPrecision(champ.id)}
                rappel={champ.sensible.rappel}
                reprise={champ.sensible.precisionDepart !== null}
                masquee={champ.sensible.precisionMasquee}
                erreur={erreur.precision ?? erreurBase('precision')}
              />
              {codes.length > 0 ? (
                <GrilleRepartition
                  indicateurId={champ.id}
                  categories={champ.sensible.categories}
                  valeurs={saisie.repartition}
                  onChange={changerCategorie(champ.id)}
                  aide={champ.sensible.aideGrille}
                  etat={etatGrille(
                    lireValeur(champ.unite, valeur),
                    lireRepartition(codes, saisie.repartition),
                  )}
                  erreur={erreur.repartition ?? erreurBase('repartition')}
                />
              ) : null}
            </div>
          )
        })}
      </FormulaireChiffres>
    </>
  )
}
