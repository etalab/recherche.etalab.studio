/**
 * Declarations
 */
const remoteUrl = `//recherche.etalab.studio`
const dom = { container: document.querySelector('.navbar-static-top .container') }
Object.assign(dom, {
  search: dom.container.querySelector('[type=search]'),
  categories: dom.container.querySelector('nav.sidebar.panel.collapse.subnav-collapse'),
  contribute: dom.container.querySelector('.call-to-action'),
})
Object.assign(dom, { cardsList: injectCardList() })
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
const searcher = new LunrSearch()

hackDom()
injectStylesheet()
listenFocus()
injectLunr(() => {
  init()
  listenSearch()
})

function injectStylesheet() {
  const style = document.createElement('link')
  style.rel = 'stylesheet'
  style.href = `${remoteUrl}/css/widget.css`
  document.head.appendChild(style)
}

function injectLunr(callback) {
  const script = document.createElement('script')
  script.src = `${remoteUrl}/js/lunr.js`
  script.onload = callback
  document.head.appendChild(script)
}

function injectCardList() {
  const div = document.createElement('div')
  div.classList.add('card-list', 'card-list--columned')
  dom.categories.parentNode.insertBefore(div, dom.categories)
  return div
}

function listenFocus() {
  dom.search.addEventListener('focus', () => enableWidget)
}

function enableWidget() {
  dom.container.classList.add('focused')
  dom.categories.classList.add('fadeout')
  dom.contribute.classList.add('fadeout')
}

function listenSearch() {
  dom.search.addEventListener('keyup', () => {
    const text = event.target.value
    search(text)
    updateInterface(text)
  })
}

async function init() {
  const populars = await loadPopularDatasets()
  loadCards(populars)
  searcher.index(populars)
  const q = new URLSearchParams(location.search).get('q')
  if(q) {
    dom.search.value = q
    search(q)
    enableWidget()
  }
}

function hackDom() {
  // Some CSS in non-overridable due to `!important` which heavy selectors
  dom.categories.id = 'categories-node'
  // Deactivate the suggestion dropdown
  dom.container.querySelector('.dropdown-menu.suggestion').remove()
  // Unsassign Vue
  dom.search.__v_model.unbind()
}


async function loadPopularDatasets() {
  const response = await fetch(`https://recherche.etalab.studio/datasets.json`)
  return await response.json()
}


function loadCards(datasets) {
  for (const [i, dataset] of datasets.entries()) {
    const content = cardTemplate.replace(/\{\{\s*(.*)\s*}}/g, (_, match) => eval(match))
    dom.cardsList.innerHTML += content.trim()
    if (i >= 6) {
      dom.cardsList.lastChild.classList.add('hidden')
    }
  }
}

function updateCardsDisplay(ids) {
  Array.from(dom.cardsList.children).forEach(card => {
    if(ids.includes(card.id)) card.classList.remove('hidden')
    else card.classList.add('hidden')
  })
}

function updateInterface(q) {
  window.history.pushState({}, '', `?q=${q}`)
}

function search(text) {
  const matches = searcher.search(text)
  updateCardsDisplay(matches.slice(0, 12).map(m => m.ref))
}

function LunrSearch() {}

LunrSearch.prototype.index = function(docs) {
  this._index = lunr(function () {
    this.ref('id')
    this.field('acronym')
    this.field('title')
    this.field('source')
    this.field('excerpt')
    docs.forEach(d => this.add(d))
  })
}

function normalizeText(text) {
  return text && text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

LunrSearch.prototype.search = function(text) {
  text = normalizeText(text)
  return this._index.search(text + '*')
}
