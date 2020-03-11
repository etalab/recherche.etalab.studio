const remoteUrl = `//recherche.etalab.studio`
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
