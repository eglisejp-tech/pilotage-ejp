import { useState } from 'react'
import { Aide } from '@/components/aide/Aide'
import type { ChampChiffre as Champ, ChampsDimanche } from '@/features/saisie-chiffres/champs'
import { ChampChiffre } from '@/features/saisie-chiffres/ChampChiffre'
import { adresseSaisieDimanche } from '@/features/saisie-chiffres/choixPeriode'
import type { DimanchePropose } from '@/features/saisie-chiffres/choixPeriode'
import {
  preparerDimanche,
  premierChampEnErreur,
  sansErreur,
} from '@/features/saisie-chiffres/envoi'
import type { ErreursFormulaire } from '@/features/saisie-chiffres/envoi'
import { FormulaireChiffres } from '@/features/saisie-chiffres/FormulaireChiffres'
import { ListePeriodes } from '@/features/saisie-chiffres/ListePeriodes'
import type { SaisieDimanche } from '@/features/saisie-chiffres/schemas'
import {
  notePourcentageActifs,
  reussiteDimanche,
  TEXTES_CHIFFRES,
} from '@/features/saisie-chiffres/textes'
import { lireValeur, valeurDepart } from '@/features/saisie-chiffres/valeurs'
import type { ValeurChamp } from '@/features/saisie-chiffres/valeurs'
import { useEnvoiSaisie } from '@/features/saisie-session/useEnvoiSaisie'
import type { DateIso } from '@/lib/metier/dates'
import { pourcentageFij } from '@/lib/metier/pourcentage'

interface Props {
  dimanche: DateIso
  /** Le dimanche du jour avant midi : seuls les indicateurs saisis le matin (X3). */
  matin: boolean
  champs: ChampsDimanche
  /** « Choisir un autre dimanche » : les 4 derniers dimanches (et celui du jour, le matin). */
  proposes: readonly DimanchePropose[]
  /** Enregistre l'envoi en une instruction ; rejette en cas d'échec (les valeurs restent). */
  enregistrer: (lignes: SaisieDimanche['lignes']) => Promise<void>
}

function valeursDeDepart(champs: readonly Champ[]): Record<string, ValeurChamp> {
  return Object.fromEntries(champs.map((champ) => [champ.id, valeurDepart(champ)] as const))
}

/** Valeur lue d'un commun pour la note en direct « 79 % des actifs ». */
function lu(champs: readonly Champ[], valeurs: Record<string, ValeurChamp>, code: string) {
  const champ = champs.find((candidat) => candidat.code === code)
  if (!champ) return null
  const lecture = lireValeur(champ.unite, valeurs[champ.id] ?? '')
  return lecture.etat === 'ok' ? lecture.valeur : null
}

/**
 * Saisie du dimanche (maquette 08, BRIEF section 9) : « STARs au service ce dimanche » dans son
 * encadré (moins et plus de 64 px, « Dimanche dernier : 9 »), « STARs actifs » et « Dont en FIJ »
 * côte à côte, préremplis et renvoyés à chaque envoi, « 79 % des actifs » calculé en direct (il ne
 * se saisit jamais), puis les indicateurs du ministère et leur aide de groupe. Tout part en un
 * seul envoi. Quatre aides au plus, toutes en flux.
 */
export function FormulaireDimanche({ dimanche, matin, champs, proposes, enregistrer }: Props) {
  const tous = [...champs.communs, ...champs.propres]
  const [valeurs, setValeurs] = useState<Record<string, ValeurChamp>>(() => valeursDeDepart(tous))
  const [erreurs, setErreurs] = useState<ErreursFormulaire>({})
  const envoi = useEnvoiSaisie()
  const preparation = preparerDimanche(tous, valeurs)
  const signature = `${dimanche}|${JSON.stringify(preparation.lignes)}`
  const pourcentage = notePourcentageActifs(
    pourcentageFij(lu(tous, valeurs, 'en_fij'), lu(tous, valeurs, 'actifs')),
  )

  const changer = (id: string) => (valeur: ValeurChamp) => {
    setValeurs((precedentes) => ({ ...precedentes, [id]: valeur }))
    setErreurs((precedentes) => ({ ...precedentes, [id]: {} }))
  }

  const soumettre = () => {
    setErreurs(preparation.erreurs)
    if (!sansErreur(preparation.erreurs)) {
      const premier = premierChampEnErreur(tous, preparation.erreurs)
      if (premier) document.getElementById(premier)?.focus()
      return
    }
    void envoi.envoyer(() => enregistrer(preparation.lignes), reussiteDimanche(dimanche), signature)
  }

  const champ = (element: Champ, noteDirecte?: string | null) => (
    <ChampChiffre
      key={element.id}
      champ={element}
      valeur={valeurs[element.id] ?? valeurDepart(element)}
      onChange={changer(element.id)}
      erreur={erreurs[element.id]?.valeur}
      noteDirecte={noteDirecte}
    />
  )
  const service = champs.communs.find((element) => element.code === 'service')
  const autresCommuns = champs.communs.filter((element) => element.code !== 'service')

  return (
    <>
      <ListePeriodes
        libelle={TEXTES_CHIFFRES.autreDimanche}
        periodes={proposes.map((propose) => ({
          cle: propose.dimanche,
          libelle: propose.libelle,
          vers: adresseSaisieDimanche(propose.dimanche),
          courante: propose.dimanche === dimanche,
        }))}
      />
      {matin ? <p className="text-encre-2">{TEXTES_CHIFFRES.matinSeulement}</p> : null}
      <FormulaireChiffres
        bouton={
          champs.correction ? TEXTES_CHIFFRES.boutonCorrection : TEXTES_CHIFFRES.boutonDimanche
        }
        envoi={envoi}
        dejaEnvoye={envoi.dejaEnvoye(signature)}
        doublon={envoi.doublonRefuse(signature)}
        erreurFormulaire={null}
        erreurSousLeBouton
        ecran="saisie_dimanche"
        onSubmit={soumettre}
      >
        {service ? (
          <div className="border border-filet bg-papier px-4 pt-1 pb-4">{champ(service)}</div>
        ) : null}
        {autresCommuns.length > 0 ? (
          // Côte à côte dans le panneau (maquette 08) ; l'un sous l'autre sous 600 px, pour que la
          // bulle d'aide en flux prenne toute la largeur de la colonne (T38, section 3).
          <div className="grid grid-cols-1 gap-3 min-[600px]:grid-cols-2">
            {autresCommuns.map((element) =>
              champ(element, element.code === 'en_fij' ? pourcentage : undefined),
            )}
          </div>
        ) : null}
        {champs.propres.length > 0 ? (
          <div className="flex flex-col gap-4">
            <div className="flex min-h-cible flex-wrap items-center">
              <p className="text-[15px] font-semibold">{TEXTES_CHIFFRES.groupePropres}</p>
              <Aide code="dimanche.propres" libelle={TEXTES_CHIFFRES.groupePropres} />
            </div>
            {champs.propres.map((element) => champ(element))}
          </div>
        ) : null}
      </FormulaireChiffres>
    </>
  )
}
