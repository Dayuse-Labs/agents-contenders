# 🎧 Prompt Suno — générer l'audio d'une battle

Suno (ou Mureka) en mode **Personnaliser / Custom**. On remplit 3 champs : **Style**, **Paroles**, **Titre**.

## 1. Réglages
- **Musique Instrumentale** : **OFF** (on veut les voix).
- **Genre vocal** : laisser libre pour un duo (voir §5 pour deux voix bien distinctes).
- Modèle : le plus récent dispo.

## 2. Champ « Style » (copier-coller)
Style = 15 à 30 descripteurs séparés par des virgules. L'anglais marche souvent mieux.

**EN (recommandé)**
```
French rap battle, two MCs trading verses, boom-bap, 90 BPM, hard kick, vinyl scratches, deep bass, crowd hype, contrasting male and female voices, aggressive articulate flow, punchlines, dark, tense, battle-stage energy
```

**FR (alternative)**
```
battle de rap français, deux MC qui s'échangent les couplets, boom-bap, 90 BPM, grosse caisse lourde, scratches vinyle, basse profonde, foule en fond, voix masculine et féminine contrastées, flow agressif et articulé, punchlines, sombre, tendu
```

## 3. Champ « Titre »
```
Agent Contenders — <Rappeur A> vs <Rappeur B>
```

## 4. Champ « Paroles » — convertir le JSON
⚠️ **Ne colle pas le JSON brut** : Suno chanterait les accolades et les clés. Convertis-le en paroles balisées :

- pour chaque tour : une balise `[Verse: <nom du rappeur>]`, puis ses bars (une ligne par bar) ;
- alterne A puis B ; entre deux rounds, ajoute `[Break]` ;
- encadre avec une intro et une outro d'ambiance.

Règle express depuis le JSON : `turn.rapper` → le `name` du rappeur · `turn.bars` → les lignes.

### Paroles prêtes — exemple Ada Lovelace vs Charles Babbage
```
[Intro]
(scratch) Agent Contenders... Ada Lovelace versus Charles Babbage. Let's go!

[Verse: Ada Lovelace]
On m'appelle l'Enchanteresse des Nombres, fille de Byron,
J'ai vu dans ta machine bien plus que des additions.
Toi tu calcules des tables, moi je compose un programme,
Note G, Bernoulli : le premier algorithme, c'est mon âme.
Tu rêves d'engrenages, moi j'ai rêvé le logiciel,
Un siècle avant le game, j'avais déjà le ciel.

[Verse: Charles Babbage]
L'Enchanteresse des nombres ? Sur MA machine, faut le dire,
Sans mon Analytical Engine, t'avais rien pour écrire.
Tu parles d'algorithme, moi j'ai pensé tout le moteur,
La Difference Engine, c'est moi, le véritable auteur.
Byron t'a donné le nom, moi j'ai donné le plan,
Range ta Note G, gamine, et respecte l'artisan.

[Break]

[Verse: Ada Lovelace]
Le plan ? T'as pris l'or de la Couronne et t'as rien fini,
Deux machines abandonnées, ton atelier est un débris.
Mes notes sont publiées, trois fois plus longues que ton texte,
Je traduis Menabrea et je double la mise au contexte.
Tu construis dans le vide, moi je vois l'usage réel,
Pendant qu'tu serres des boulons, j'invente l'immatériel.

[Verse: Charles Babbage]
Abandonnées ? J'étais en avance, le siècle suivait pas,
Tes notes trois fois plus longues commentaient MES schémas.
Tu traduis Menabrea ? Donc tu pars de mon travail,
Moi j'ai posé la table avant que tu tiennes le détail.
Et pour les boulons, ma belle, c'est ça, bâtir pour de vrai,
Toi tu rêves sur papier, moi je forge le projet.

[Break]

[Verse: Ada Lovelace]
Bâtir pour de vrai ? Ta machine a jamais tourné,
Moi mon idée tourne encore, chaque code en est l'héritier.
Tu détestais les musiciens de rue, t'en as fait une croisade,
Moi j'ai mis la musique DANS la machine, quelle façade.
On retient l'Enchanteresse quand on parle du futur,
Toi t'es la note de bas de page, moi la partition pure.

[Verse: Charles Babbage]
Note de bas de page ? Tout ce game lit MON chapitre,
Sans Babbage, pas de Lovelace : je suis le premier maître.
Tu mets la musique dans la machine, jolie trouvaille,
Mais c'est moi qui ai forgé la scène où ton idée travaille.
Garde ta partition, je garde l'instrument complet :
L'Histoire nous cite ensemble — et c'est moi qu'elle met en premier.

[Outro]
(foule) Au public de voter !
```

## 5. Astuce « deux voix bien distinctes »
Le JSON de chaque battle porte `sex` et `age` par rappeur — sers-t'en pour régler le **Genre Vocal** (féminin/masculin) et viser un timbre d'âge cohérent.

Dans un seul morceau, Suno ne garantit pas une voix par rappeur même avec les balises. Deux options :

- **Simple** : un seul morceau, balises `[Verse: ...]` + style « contrasting male and female voices ». Suffisant pour l'effet.
- **Net** : générer **chaque rappeur séparément** (Genre Vocal Féminin pour l'un, Masculin pour l'autre), puis monter les couplets bout à bout. Plus de contrôle, un peu plus de boulot.

## 6. Limite de longueur
Une battle longue peut dépasser la limite de paroles d'une génération : dans ce cas, génère **round par round** (ou A puis B) et assemble.

## 7. Et l'app lecteur ?
La page `contenders.html` utilise pour l'instant la voix du navigateur. Si tu pars sur l'audio Suno, je peux l'adapter pour **jouer le mp3 Suno synchronisé** à la révélation des bars (plutôt que la synthèse vocale) — dis-le-moi.
