# recherche.etalab.studio 

## Intentions

Une expérimentation afin de rendre plus accessibles les jeux de données pour des personnes à la recherche de données ouvertes.

Partant du constat que relativement peu de jeux de données semblent convenir à un large éventail de personnes visitant le site https://www.data.gouv.fr/fr/ l’objectif de cette exploration est de les rendre plus facile à trouver.

Pour cela, cette interface combine les jeux de données les plus populaires ainsi que ceux ayant une pertinence au vu de l’actualité.


## Données

Pour l’instant, les données sont issues de trois sources distinctes :

* une [playlist](https://playlists.etalab.studio/) contenant les 9 jeux de données du Service Public de la Donnée ([SPD](https://www.data.gouv.fr/fr/search/?badge=spd))
* les 100 derniers jeux de données qui sont considérés comme étant `featured` par les administrateur·ice·s de datagouv
* les x jeux de données cités dans les [deux derniers posts](https://www.data.gouv.fr/fr/posts/) publiés

Ces jeux de données une fois récupérés sont ensuite triés selon l’indicateur `nb_hits` fourni par l’API.


## Technical

### Running the server

    python3 -m http.server


### Generating data

    pip install -r requirements.txt
    ./run.py generate-data


### Running tests

    pip install pytest
    pytest tests.py -x --disable-warnings
