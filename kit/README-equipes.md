# 🎤 Agent Contenders — Guide des équipes

Votre mission : créer **un agent rappeur** avec Claude Code. Votre agent **incarne une vraie personnalité** (avec page Wikipédia) et affrontera ceux des autres équipes en battle, tour par tour, devant le public qui votera.

La nouveauté : votre agent est un **vrai agent à outils**. Avant de rapper, il va **fouiller le Wikipédia de son adversaire** pour en tirer des punchlines factuelles.

## Étape 1 — Choisissez votre personnalité
Une vraie figure publique avec une **page Wikipédia fournie** (plus il y a de matière, meilleur sera le clash). Tech, histoire, sport, ciné… à vous de voir.

## Étape 2 — Créez votre rappeur
Deux façons :

- Copiez `TEMPLATE-rappeur.md` (racine du kit), renommez-le et remplissez les crochets `[…]`.
- Ou lancez `/agents` dans Claude Code et collez-y votre persona.

Modèle complet fourni : `agents/exemple-ada-lovelace.md`.

⚠️ Gardez la ligne `tools: WebSearch, WebFetch` dans le frontmatter — c'est elle qui donne à votre agent le pouvoir de chercher.

## Étape 3 — Rangez le fichier au bon endroit
Dans `.claude/agents/votre-figure.md` du repo du tournoi. Nom de fichier et `name:` en kebab-case (ex : `ada-lovelace`).

## Étape 4 — Testez-le

```
@agent-ada-lovelace Ton adversaire incarne Charles Babbage. Recherche-le, puis fais ton couplet d'ouverture.
```

Votre agent devrait aller lire Wikipédia, puis cracher ses bars. Itérez le flow et la personnalité jusqu'à ce que ça envoie.

## Les règles (rappel)
- Clash sur des **faits publics et notoires** uniquement. Factuel : pas de fausses citations.
- **Interdits** : santé, vie privée / famille, affaires judiciaires, sujets sensibles, attributs protégés.
- Réponds toujours au dernier couplet adverse.
- 12-16 bars, en **français**, familier mais **sans insulte vulgaire**.
- On clashe le **personnage public**, avec le sourire.

## À quoi ça ressemble — démo
Extrait (volontairement gentil et factuel) entre **Ada Lovelace** et **Charles Babbage** :

> **ADA LOVELACE**
> Babbage, t'as dessiné des machines jamais terminées,
> Moi j'ai vu la musique dans les nombres, t'es resté à calculer.
> Tu empiles les engrenages, moi j'écris le premier algo,
> Note G dans le game : c'est mon nom qu'on cite en intro.

> **CHARLES BABBAGE** *(il reprend ses mots)*
> Le premier algo ? Sur MA machine, faut quand même le noter,
> Sans mon Analytical Engine, t'avais rien à programmer.
> Tu parles de musique, moi j'ai bâti l'instrument tout entier,
> J'ai pensé l'ordinateur un siècle avant les premiers.

À vous de trouver la personnalité qui mettra tout le monde d'accord. 🏆
