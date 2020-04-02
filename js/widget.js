/**
 * Declarations
 */
const remoteUrl = `//recherche.etalab.studio`
const datasetsUrl = '//localhost:8080/datasets.json'
const dom = { container: document.querySelector('.navbar-static-top .container') }
Object.assign(dom, {
  search: dom.container.querySelector('[type=search]'),
  categories: dom.container.querySelector('nav.sidebar.panel.collapse.subnav-collapse'),
  contribute: dom.container.querySelector('.call-to-action'),
})
Object.assign(dom, { closeButton: injectCloseButton(), cardsList: injectCardList() })
const cardTemplate = `<div class="col-xs-12 col-md-4 col-sm-6" id="{{ id }}">
<a class="card dataset-card" href="{{ page }}">
  <div class="card-logo">
    <img alt="{{ title }}"
      src="{{ logo_url }}" width="70" height="70">
  </div>
  {{ certified_img }}
  <div class="card-body">
    <h4>{{ title }}</h4>
    <div class="clamp-3">{{ excerpt }}</div>
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
  let countLoad = 0
  function nextLoaded() {
    countLoad++
    if (countLoad == 2) callback()
  }
  function loaded() {
    const fragment = document.createDocumentFragment()
    script = document.createElement('script')
    script.src = `//localhost:8080/js/lunr.stemmer.support.js`
    fragment.appendChild(script)
    script.onload = nextLoaded
    script = document.createElement('script')
    script.src = `//localhost:8080/js/lunr.fr.js`
    fragment.appendChild(script)
    script.onload = nextLoaded
    document.head.appendChild(fragment)
  }
  let script = document.createElement('script')
  script.src = `${remoteUrl}/js/lunr.js`
  script.onload = loaded
  document.head.appendChild(script)
}

function injectCloseButton() {
  const button = document.createElement('button')
  button.classList.add('close')
  button.innerText = "╳"
  dom.categories.parentNode.insertBefore(button, dom.categories)
  button.addEventListener('click', disableWidget)
  return button
}

function injectCardList() {
  const div = document.createElement('div')
  div.classList.add('card-list', 'card-list--columned')
  dom.categories.parentNode.insertBefore(div, dom.categories)
  return div
}

function listenFocus() {
  dom.search.addEventListener('focus', enableWidget)
}

function enableWidget() {
  dom.container.classList.add('focused')
  dom.categories.classList.add('fadeout')
  dom.contribute.classList.add('fadeout')
}

function disableWidget() {
  dom.container.classList.remove('focused')
  dom.categories.classList.remove('fadeout')
  dom.contribute.classList.remove('fadeout')
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
  const response = await fetch(datasetsUrl)
  return await response.json()
}


function loadCards(datasets) {
  for (const [i, dataset] of datasets.entries()) {
    if (dataset.certified) {
      dataset.certified_img = `<img
        src="https://static.data.gouv.fr/_themes/gouvfr/img/certified-stamp.png"
        alt="certified" class="certified"
      >`
    } else {
      dataset.certified_img = ''
    }
    const content = cardTemplate.replace(
      /\{\{\s*(.*)\s*}}/g,
      (_, match) => dataset[match.trim()]
    )
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

function cleanupDiacritic(builder) {
  function pipelineFunction(token) {
    return token.update(() => normalizeText(String(token)))
  }
  lunr.Pipeline.registerFunction(pipelineFunction, 'cleanupDiacritic')
  builder.pipeline.after(lunr.stemmer, pipelineFunction)
  builder.searchPipeline.before(lunr.stemmer, pipelineFunction)
}

LunrSearch.prototype.index = function(docs) {
  this._index = lunr(function () {
    this.use(cleanupDiacritic)
    this.ref('id')
    this.field('acronym')
    this.field('title')
    this.field('excerpt')
    this.field('source')
    docs.forEach(d => {
      const tmp = {
        id: d.id,
        keywords: [d.source, d.title, d.source, d.excerpt].join(' ')
      }
      this.add(d)
    })

  })
}

function normalizeText(text) {
  return text && text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

LunrSearch.prototype.search = function(text) {
  return this._index.search(text + '~2')
}
