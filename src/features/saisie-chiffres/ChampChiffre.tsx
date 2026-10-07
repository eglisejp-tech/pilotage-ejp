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
 * minutes), sa définition visible, son aide s'il en a une, la mention d'un ajout qui attend EJP
 * Tech (sous la définition, avant le champ), puis « Déjà saisi : ... » quand une saisie fait foi
 * pour la période (sous le champ). Ces deux phrases sont reliées au champ par `aria-describedby`.
 * Un calcul n'est jamais un champ (il n'arrive pas ici).
 */
export function ChampChiffre({ champ, valeur, onChange, erreur, noteDirecte }: Props) {
  const id = idChamp(champ.id)
  const note = noteDirecte ?? champ.note ?? undefined
  const mention = champ.aValider ? texteAjoutAValider('ministere', null) : undefined
  const dejaSaisi = champ.deja
    ? phraseDejaSaisi(formaterValeur(champ.deja.valeur, champ.unite), champ.deja.saisi_le)
    : undefined
  return typeof valeur === 'string' ? (
    <ChampNombre
      id={id}
      libelle={champ.libelle}
      valeur={valeur}
      onChange={onChange}
      max={plafondUnite(champ.unite)}
      variante={champ.variante}
      aide={champ.aide ?? undefined}
      definition={champ.definition}
      mention={mention}
      note={note}
      dejaSaisi={dejaSaisi}
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
      mention={mention}
      note={note}
      dejaSaisi={dejaSaisi}
      erreur={erreur}
    />
  )
}
