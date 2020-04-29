# Recherche Etalab Studio

## Intentions

Une expérimentation afin de rendre plus accessibles les jeux de données pour des personnes à la recherche de données ouvertes.

Partant du constat que relativement peu de jeux de données semblent convenir à un large éventail de personnes visitant le site https://www.data.gouv.fr/fr/ l’objectif de cette exploration est de les rendre plus facile à trouver.

Pour cela, cette interface combine les jeux de données les plus populaires ainsi que ceux ayant une pertinence au vu de l’actualité.


### Code widget

Afin d’activer cette interface prototype :

1. rendez-vous sur https://data.gouv.fr (ou sa déclinaison _demo_)
2. ouvrir la console développeur, et coller le code de widget ci-dessous
3. utiliser le champ de recherche par mots-clés

Le code suivant invoque le widget de recherche augmentée et l’active sur la page d’accueil :

```
const script = document.createElement('script')
script.src = 'https://recherche.etalab.studio/js/widget.js'
document.head.appendChild(script)
```

La zone de recherche s’ouvre au _focus_ pour proposer une version étendue, focalisant sur les résultats.

#### Transpiler le code du widget

Après avoir édité `js/src/widget.js` :

```
npm install
npm run build
```

NB: cette transpilation est faite automatiquement sur le dépôt Github.

## Données

Pour l’instant, les données sont issues :

* d’une [playlist](https://playlists.etalab.studio/) contenant les 9 jeux de données du Service Public de la Donnée ([SPD](https://www.data.gouv.fr/fr/search/?badge=spd))
* des 100 jeux de données les plus populaires cette année d’après Matomo ;
* des datasets liés depuis le suivi des sorties dans les [billets éditoriaux publiés](https://www.data.gouv.fr/fr/posts/)

Ces jeux de données une fois récupérés sont ensuite dédoublonnés et triés selon l’indicateur `nb_hits` fourni par Matomo (puis par défaut par l’API).


## Interviews

Plusieurs interviews ont été réalisées de façon à itérer sur le produit en prenant en compte les besoins des utilisateur·ice·s :

* De juillet à septembre 2017 : [voir le dépôt dédié](https://github.com/etalab/user-research)
* Le 7 janvier 2020 : [Charlotte](https://github.com/etalab/recherche.etalab.studio/blob/master/interviews/20200107-charlotte.md)
* Le 10 janvier 2020 : [Tom](https://github.com/etalab/recherche.etalab.studio/blob/master/interviews/20200110-tom.md)
* Le 23 janvier 2020 : [Arnaud](https://github.com/etalab/recherche.etalab.studio/blob/master/interviews/20200123-arnaud.md)
* le 4 février 2020 : [Edouard](https://github.com/etalab/recherche.etalab.studio/blob/master/interviews/20200204-edouard.md)
* le 7 février 2020 : [Edwige](https://github.com/etalab/recherche.etalab.studio/blob/master/interviews/20200207-edwige.md)

Une [synthèse des 5 interviews](https://github.com/etalab/recherche.etalab.studio/blob/master/interviews/synthese.md) de 2020 condense les grandes idées qui en sont sorties.

N’hésitez pas à nous solliciter, par exemple [en créant une issue](https://github.com/etalab/recherche.etalab.studio/issues/new) si vous voulez être interviewé·e.


## Technical

### Running the server

    python3 -m http.server


### Generating data

    pip install -r requirements.txt
    ./run.py generate-data


### Running tests

    pip install pytest
    pytest tests.py -x --disable-warnings
