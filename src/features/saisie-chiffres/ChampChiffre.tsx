import { ChampNombre } from '@/features/saisie/ChampNombre'
import { texteAjoutAValider } from '@/features/indicateurs/textesVides'
import type { ChampChiffre as Champ } from '@/features/saisie-chiffres/champs'
import { ChampHeure } from '@/features/saisie-chiffres/ChampHeure'
import { idChamp } from '@/features/saisie-chiffres/envoi'
import { phraseDejaSaisi } from '@/features/saisie-chiffres/textes'
import type { ValeurChamp } from '@/features/saisie-chiffres/valeurs'
import { formaterValeur, plafondUnite, suffixeUnite } from '@/lib/metier/unites'

interface Props {
  champ: Champ
  valeur: ValeurChamp
  onChange: (valeur: ValeurChamp) => void
  erreur?: string
  /** Note calculée en direct (« 79 % des actifs ») ; sinon la note fixe du champ. */
  noteDirecte?: string | null
}

/**
 * Un chiffre à saisir : le champ de son unité (nombre avec son suffixe, ou heure en heures et
 * minutes), sa définition visible, son aide s'il en a une, puis « Déjà saisi : ... » quand une
 * saisie fait foi pour la période, et la mention d'un ajout qui attend EJP Tech. Un calcul n'est
 * jamais un champ (il n'arrive pas ici).
 */
export function ChampChiffre({ champ, valeur, onChange, erreur, noteDirecte }: Props) {
  const id = idChamp(champ.id)
  const note = noteDirecte ?? champ.note ?? undefined
  return (
    <div className="flex flex-col gap-1.5">
      {typeof valeur === 'string' ? (
        <ChampNombre
          id={id}
          libelle={champ.libelle}
          valeur={valeur}
          onChange={onChange}
          max={plafondUnite(champ.unite)}
          variante={champ.variante}
          aide={champ.aide ?? undefined}
          definition={champ.definition}
          note={note}
          erreur={erreur}
          suffixe={suffixeUnite(champ.unite)}
        />
      ) : (
        <ChampHeure
          id={id}
          libelle={champ.libelle}
          valeur={valeur}
          onChange={onChange}
          aide={champ.aide}
          definition={champ.definition}
          erreur={erreur}
        />
      )}
      {champ.aValider ? (
        <p className="text-sm leading-normal text-encre-2">
          {texteAjoutAValider('ministere', null)}
        </p>
      ) : null}
      {champ.deja ? (
        <p className="text-sm leading-normal text-encre-3">
          {phraseDejaSaisi(formaterValeur(champ.deja.valeur, champ.unite), champ.deja.saisi_le)}
        </p>
      ) : null}
    </div>
  )
}
