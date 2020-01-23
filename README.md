# recherche.etalab.studio 

https://recherche.etalab.studio

## Intentions

Une expérimentation afin de rendre plus accessibles les jeux de données pour des personnes à la recherche de données ouvertes.

Partant du constat que relativement peu de jeux de données semblent convenir à un large éventail de personnes visitant le site https://www.data.gouv.fr/fr/ l’objectif de cette exploration est de les rendre plus facile à trouver.

Pour cela, cette interface combine les jeux de données les plus populaires ainsi que ceux ayant une pertinence au vu de l’actualité.


## Données

Pour l’instant, les données sont issues de trois [playlists](https://playlists.etalab.studio/) distinctes :

* la première contenant les 9 jeux de données du Service Public de la Donnée ([SPD](https://www.data.gouv.fr/fr/search/?badge=spd))
* la seconde contenant les 100 jeux de données les plus populaires sur l’année 2019
* la troisième contenant les jeux de données qui ont été liés lors du dernier article de blog

Ces jeux de données une fois récupérés sont ensuite dédoublonnés et triés selon l’indicateur `nb_hits` fourni par Matomo (puis par défaut par l’API).


## Interviews

Plusieurs interviews ont été réalisées de façon à itérer sur le produit en prenant en compte les besoins des utilisateur·ice·s :

* De juillet à septembre 2017 : [voir le dépôt dédié](https://github.com/etalab/user-research)
* Le 7 janvier 2020 : [Charlotte](https://github.com/etalab/recherche.etalab.studio/blob/master/interviews/20200107-charlotte.md)
* Le 10 janvier 2020 : [Tom](https://github.com/etalab/recherche.etalab.studio/blob/master/interviews/20200110-tom.md)
* Le 23 janvier 2020 : [Arnaud](https://github.com/etalab/recherche.etalab.studio/blob/master/interviews/20200123-arnaud.md)

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
