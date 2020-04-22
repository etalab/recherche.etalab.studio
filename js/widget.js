/**
 * Declarations
 */
const remoteUrl = `//recherche.etalab.studio`
const datasetsUrl = `${remoteUrl}/datasets.json`
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
  // Lunr injection must be performed step by step.
  const lunrScript = document.createElement('script')
  lunrScript.src = `${remoteUrl}/js/lunr.js`
  lunrScript.onload = loadStemmer
  document.head.appendChild(lunrScript)
  function loadStemmer() {
    const lunrStemmerScript = document.createElement('script')
    lunrStemmerScript.src = `${remoteUrl}/js/lunr.stemmer.support.js`
    lunrStemmerScript.onload = loadLunrFr
    document.head.appendChild(lunrStemmerScript)
  }
  function loadLunrFr() {
    const lunrFrScript = document.createElement('script')
    lunrFrScript.src = `${remoteUrl}/js/lunr.fr.js`
    lunrFrScript.onload = callback
    document.head.appendChild(lunrFrScript)
  }
}

function injectCloseButton() {
  const button = document.createElement('button')
  button.classList.add('close')
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
  stats('widget', 'open')
}

function disableWidget() {
  dom.container.classList.remove('focused')
  dom.categories.classList.remove('fadeout')
  dom.contribute.classList.remove('fadeout')
  stats('widget', 'close')
}

function listenSearch() {
  dom.search.addEventListener('keyup', () => {
    const text = event.target.value
    if(search)search(text)
    updateInterface(text)
  })
}

function listenCardsClick() {
  Array.from(dom.cardsList.querySelectorAll('a.card')).forEach(a => {
    a.addEventListener('click', event => {
      stats('click', event.currentTarget.href)
    })
  })
}

async function init() {
  const populars = await loadPopularDatasets()
  loadCards(populars)
  listenCardsClick()
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
    if(!dataset.logo_url) dataset.logo_url = ''
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
  const params = new URLSearchParams(location.search)
  params.set('q', q)
  const qs = Array.from(params).map(pair => `${pair[0]}=${pair[1]}`).join('&')
  window.history.pushState({}, '', `?${qs}`)
}

function search(text) {
  const matches = searcher.search(text)
  // Deactivated as search stats is already recording
  // stats('search', text)
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
  text = text.split(/\s+/g).reduce((acc, w) => {
    const requirement = w.length > 3 ? '+' : ''
    let fuzziness = ''
    if(w.length <= 4 && acc.length > 0) fuzziness = '*'
    else if(w.length > 4) fuzziness = '~2'
    if(w) acc.push(`${requirement}${w}${fuzziness}`)
    return acc
  }, []).join(' ')
  return this._index.search(text)
}

function stats(category, action) {
  if(!Piwik) return
  const t = Piwik.getTracker()
  t.trackEvent(`Recherche/${category}`, action)
}
