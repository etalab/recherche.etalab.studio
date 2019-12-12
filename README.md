# recherche.etalab.studio 

## Intentions

Une expérimentation afin de rendre plus accessibles les jeux de données pour des personnes à la recherche de données ouvertes.

Partant du constat que relativement peu de jeux de données semblent convenir à un large éventail de personnes visitant le site https://www.data.gouv.fr/fr/ l’objectif de cette exploration est de les rendre plus facile à trouver.

Pour cela, cette interface combine les jeux de données les plus populaires ainsi que ceux ayant une pertinence au vu de l’actualité.


## Technical

### Running the server

    python3 -m http.server


### Generating data

    pip install -r requirements.txt
    ./run.py generate-data


### Running tests

    pip install pytest
    pytest tests.py -x --disable-warnings
