/* Matomo */
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
/* End Matomo Code */

const moreResultsButton = document.querySelector('#more-results')
const searchField = document.querySelector('input[type=search')
const urlParams = new URLSearchParams(window.location.search)
const query = urlParams.get('q')

if (query) {
  searchField.value = query
  updateSearch(query)
}

function updateSearch(q) {
  moreResultsButton.href = moreResultsButton.dataset.href.replace('%s', q)
  window.history.pushState({}, '', `?q=${q}`)
}

const list = new List('main', {
  valueNames: ['title', { name: 'content', attr: 'data-indexme' }],
  fuzzySearch: {
    distance: 800,
    threshold: 0.3
  }
})
if (query) list.fuzzySearch(query)
list.on('searchComplete', list => {
  const searchTerms = list.search.arguments[0]
  _paq.push(['trackEvent', 'Search', 'Type', searchTerms])
  updateSearch(searchTerms)
})
