// const remoteUrl = `//recherche.etalab.studio`
const remoteUrl = `http://localhost:8080`
const containerNode = document.querySelector('.navbar-static-top .container')
const categoriesNode = containerNode.querySelector('nav.sidebar.panel.collapse.subnav-collapse')
const cardsListNode = injectCardList()
const contributeNode = containerNode.querySelector('.call-to-action')
const searchNode = containerNode.querySelector('[type=search]')


const cardTemplate = `<div class="col-xs-12 col-md-4 col-sm-6" id="{{ dataset.id }}">
<a class="card dataset-card" href="{{ dataset.page }}">
  <div class="card-logo">
    <img alt="{{ dataset.title }}"
      src="{{ dataset.logo_url }}" width="70" height="70">
  </div>
  <img src="https://static.data.gouv.fr/_themes/gouvfr/img/certified-stamp.png?_=1.6.13" alt="certified" class="certified">
  <div class="card-body">
    <h4>{{ dataset.title }}</h4>
    <div class="clamp-3">{{ dataset.excerpt }}</div>
  </div>
</a>
</div>`

const spoofedContent = `<div class="container">
<div>
    <div class="bg"></div>
    <div class="bg collapse sidebg-collapse"></div>
</div>

<div class="search_sidebar col-sm-5 col-md-4 col-xs-12" role="search">

    <nav>
      <site-search v-ref:search action="/fr/search/" placeholder="Recherche"

size="lg"
>
<form class="site-search" action="/fr/search/">
    <div class="input-group input-group-lg">
        <div class="input-group-btn">
            <button class="btn" type="submit"><i class="fa fa-search"></i></button>
        </div>
        <label for="search" class="hidden">Recherche</label>
        <input id="search" name="q" type="search" class="form-control" placeholder="Recherche" />
    </div>
</form>
</site-search>
<div class="card-list card-list--columned">
<template>
  <div class="col-xs-12 col-md-4 col-sm-6" id="{{ dataset.id }}">
    <a class="card dataset-card" href="{{ dataset.page }}">
      <div class="card-logo">
        <img alt="Ministère de l'Intérieur"
          src="{{ dataset.logo_url }}" width="70" height="70">
      </div>
      <img src="https://static.data.gouv.fr/_themes/gouvfr/img/certified-stamp.png?_=1.6.13" alt="certified"
        class="certified">
      <div class="card-body">
        <h4>{{ dataset.title }}</h4>
        <div class="clamp-3">{{ dataset.excerpt }}</div>
      </div>
    </a>
  </div>
</template>
</div>
</nav>

        <nav id="nav-categories" class="sidebar panel collapse subnav-collapse">
            <!-- Groups -->
            <div class="list-group">

                <a class="list-group-item" href="/fr/topics/agriculture-et-alimentation/">
                    Agriculture et Alimentation
                </a>

                <a class="list-group-item" href="/fr/topics/culture/">
                    Culture, Communications
                </a>

                <a class="list-group-item" href="/fr/topics/economie-et-emploi/">
                    Comptes, Économie et Emploi
                </a>

                <a class="list-group-item" href="/fr/topics/education-et-recherche/">
                    Éducation, Recherche, Formation
                </a>

                <a class="list-group-item" href="/fr/topics/international-et-europe/">
                    International, Europe
                </a>

                <a class="list-group-item" href="/fr/topics/logement-developpement-durable-et-energie/">
                    Environnement, Énergie, Logement
                </a>

                <a class="list-group-item" href="/fr/topics/sante-et-social/">
                    Santé et Social
                </a>

                <a class="list-group-item" href="/fr/topics/societe/">
                     Société, Droit, Institutions
                </a>

                <a class="list-group-item" href="/fr/topics/territoires-et-transports/">
                    Territoires, Transports, Tourisme
                </a>

            </div>
        </nav>

    </div>

    <div id="contribute-block" class="call-to-action col-sm-7 col-md-8 col-lg-7 col-xs-12">
        <h2>Partagez, améliorez et réutilisez les données publiques</h2>
        <div class="collapse subnav-collapse">
            <button class="btn btn-primary btn-big btn-transparent btn-left"
                    title="Contribuez !"
                    @click="$refs.publishActionModal.show"
                    data-track-content data-content-name="CTA" data-content-piece="home/contribute">
                <span class="fa fa-plus"></span>
                Contribuez !
            </button>
        </div>
    </div>

</div>`

hackDom()
injectStylesheet()
listenFocus()
init()

function injectStylesheet() {
  const style = document.createElement('link')
  style.rel = 'stylesheet'
  style.href = `${remoteUrl}/css/widget.css`
  document.head.appendChild(style)
}

function injectCardList() {
  const div = document.createElement('div')
  div.classList.add('card-list', 'card-list--columned')
  categoriesNode.parentNode.insertBefore(div, categoriesNode)
  return div
}

function listenFocus() {
  searchNode.addEventListener('focus', () => {
    containerNode.classList.add('focused')
    categoriesNode.classList.add('fadeout')
    contributeNode.classList.add('fadeout')
  })
}

async function init() {
  const datasets = await loadDatasets()
  loadCards(datasets)
  const q = new URLSearchParams(location.search).get('q')
  // if(q) {
  //   search(q)
  //   if (searchInput) searchInput.value = q
  // }
}

/**
 * Some CSS in non-overridable due to `!important` which
 * heavy selectors
 */
function hackDom() {
  categoriesNode.id = 'categories-node'
}

async function loadDatasets() {
  const response = await fetch(`https://recherche.etalab.studio/datasets.json`)
  return await response.json()
}


function loadCards(datasets) {
  for (const [i, dataset] of datasets.entries()) {
    const content = cardTemplate.replace(/\{\{\s*(.*)\s*}}/g, (_, match) => eval(match))
    cardsListNode.innerHTML += content.trim()
    if (i >= 6) {
      cardsListNode.lastChild.classList.add('hidden')
    }
  }
}
