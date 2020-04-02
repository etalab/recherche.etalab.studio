const template = document.querySelector('#search-container template').innerHTML
const searchInput = document.getElementById('search')
var index

function initSearch(docs) {
  return lunr(function () {
    this.ref('id')
    this.field('acronym')
    this.field('title')
    this.field('source')
    this.field('excerpt')
    docs.forEach(d => this.add(d))
  })
}

function normalizeText(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function search(text) {
  if(!text.trim()) return resetCardsDisplay()
  text = normalizeText(text)
  const matches = index.search(text)
  updateCardsDisplay(matches.map(m => m.ref))
  updateInterface(text)
}

async function loadDatasets() {
  const response = await fetch('/datasets.json')
  return await response.json()
}

function loadCards(datasets) {
  for (const [i, dataset] of datasets.entries()) {
    const content = template.replace(/\{\{\s*(.*)\s*}}/g, (_, match) => eval(match))
    cardsList.innerHTML += content.trim()
    if (i >= 6) {
      cardsList.lastChild.classList.add('hidden')
    }
  }
}

function updateInterface(q) {
  window.history.pushState({}, '', `?q=${q}`)
}

function resetCardsDisplay() {
  Array.from(cardsList.querySelectorAll('.hidden')).forEach(c => c.classList.remove('hidden'))
}

function updateCardsDisplay(visibleCards) {
  Array.from(cardsList.childNodes).filter(c => c.classList).forEach(card => card.classList.add('hidden'))
  visibleCards.splice(0, 6).forEach(id => document.getElementById(id).classList.remove('hidden'))
}

async function initCards () {
  const datasets = await loadDatasets()
  index = initSearch(datasets)
  loadCards(datasets)
  const q = new URLSearchParams(location.search).get('q')
  if(q) {
    search(q)
    if (searchInput) searchInput.value = q
  }
}
