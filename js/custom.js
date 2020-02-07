const template = document.querySelector('template').innerHTML
const container = document.querySelector('#datasets-container')
const moreResultsButton = document.querySelector('#more-results')
const index = elasticlunr(function () {
  this.use(lunr.fr)
  this.addField('acronym')
  this.addField('title')
  this.addField('source')
  this.addField('excerpt')
  this.setRef('id')
  this.pipeline.add(function (token, tokenIndex, tokens) {
    return normalizeText(token)
  })
})

function normalizeText(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function search(text) {
  if(!text.trim()) return resetCardsDisplay()
  text = normalizeText(text)
  const matches = index.search(text, { fields: {
    acronym: { boost: 4 },
    source: { boost: 3 },
    title: { boost: 2 },
    excerpt: { boost: 1 },
  }})
  updateCardsDisplay(matches.map(m => m.ref))
  updateInterface(text)
  if(window._paq) window._paq.push(['trackEvent', 'Search', 'Type', text])
}

async function loadDatasets() {
  const response = await fetch('/datasets.json')
  return await response.json()
}

function loadCards(datasets) {
  datasets.forEach(dataset => {
    index.addDoc(dataset)
    const content = template.replace(/\{\{\s*(.*)\s*}}/g, (_, match) => eval(match))
    container.innerHTML += content.trim()
  })
}

function updateInterface(q) {
  moreResultsButton.href = moreResultsButton.dataset.href.replace('%s', q)
  window.history.pushState({}, '', `?q=${q}`)
}

function resetCardsDisplay() {
  Array.from(container.querySelectorAll('.hidden')).forEach(c => c.classList.remove('hidden'))
}

function updateCardsDisplay(visibleCards) {
  container.childNodes.forEach(card => card.classList.add('hidden'))
  visibleCards.forEach(id => document.getElementById(id).classList.remove('hidden'))
}

async function initCards () {
  const datasets = await loadDatasets()
  loadCards(datasets)
  const q = new URLSearchParams(location.search).get('q')
  if(q) {
    search(q)
    document.getElementById('search').value = q
  }
}

function loadMatomo() {
  var _paq = window._paq || []
  /* tracker methods like "setCustomDimension" should be called before "trackPageView" */
  _paq.push(['trackPageView'])
  _paq.push(['enableLinkTracking'])
  ;(function() {
    var u = '//stats.data.gouv.fr/'
    _paq.push(['setTrackerUrl', u + 'piwik.php'])
    _paq.push(['setSiteId', '106'])
    var d = document,
      g = d.createElement('script'),
      s = d.getElementsByTagName('script')[0]
    g.type = 'text/javascript'
    g.async = true
    g.defer = true
    g.src = u + 'piwik.js'
    s.parentNode.insertBefore(g, s)
  })()
}
