const template = document.querySelector('#search-container template').innerHTML
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
}

async function loadDatasets() {
  const response = await fetch('/datasets.json')
  return await response.json()
}

function loadCards(datasets) {
  datasets.splice(0, 6).forEach(dataset => {
    index.addDoc(dataset)
    const content = template.replace(/\{\{\s*(.*)\s*}}/g, (_, match) => eval(match))
    cardsList.innerHTML += content.trim()
  })
}

function updateInterface(q) {
  moreResultsButton.href = moreResultsButton.dataset.href.replace('%s', q)
  window.history.pushState({}, '', `?q=${q}`)
}

function resetCardsDisplay() {
  Array.from(cardsList.querySelectorAll('.hidden')).forEach(c => c.classList.remove('hidden'))
}

function updateCardsDisplay(visibleCards) {
  Array.from(cardsList.childNodes).filter(c => c.classList).forEach(card => card.classList.add('hidden'))
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
